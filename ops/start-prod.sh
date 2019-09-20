#!/usr/bin/env bash
set -e

# turn on swarm mode if it's not already on
docker swarm init 2> /dev/null || true

registry="docker.io/connextproject"

####################
# External Env Vars

INDRA_DOMAINNAME="${INDRA_DOMAINNAME:-localhost}"
INDRA_EMAIL="${INDRA_EMAIL:-noreply@gmail.com}" # for notifications when ssl certs expire
INDRA_ETH_PROVIDER="${INDRA_ETH_PROVIDER}"
INDRA_MODE="${INDRA_MODE:-staging}" # set to "prod" to use versioned docker images

####################
# Internal Config

ganache_chain_id="4447"
log_level="3" # set to 5 for all logs or to 0 for none
nats_port="4222"
node_port="8080"
number_of_services="6" # NOTE: Gotta update this manually when adding/removing services :(
project="indra"

####################
# Helper Functions

# Initialize new secrets (random if no value is given)
function new_secret {
  secret="$2"
  if [[ -z "$secret" ]]
  then secret=`head -c 32 /dev/urandom | xxd -plain -c 32 | tr -d '\n\r'`
  fi
  if [[ -z "`docker secret ls -f name=$1 | grep -w $1`" ]]
  then
    id=`echo "$secret" | tr -d '\n\r' | docker secret create $1 -`
    echo "Created secret called $1 with id $id"
  fi
}

# Get images that we aren't building locally
function pull_if_unavailable {
  if [[ -z "`docker image ls | grep ${1%:*} | grep ${1#*:}`" ]]
  then
    # But actually don't pull images if we're running locally
    if [[ "$INDRA_DOMAINNAME" != "localhost" ]]
    then docker pull $1
    fi
  fi
}

########################################
## Database Conig

if [[ "$INDRA_MODE" == "test" ]]
then
  db_volume="database_test_`date +%y%m%d_%H%M%S`"
  db_secret="${project}_database_test"
  new_secret "$db_secret" "$project"
else
  db_volume="database"
  db_secret="${project}_database"
  new_secret $db_secret
fi

# database connection settings
postgres_db="$project"
postgres_host="database"
postgres_password_file="/run/secrets/$db_secret"
postgres_port="5432"
postgres_user="$project"

########################################
## Ethereum Config

if [[ -z "$INDRA_ETH_PROVIDER" ]]
then echo "An env var called INDRA_ETH_PROVIDER is required" && exit 1
elif [[ "$INDRA_ETH_PROVIDER" =~ .*://localhost:.* ]]
then chainId="$ganache_chain_id"
else chainId="`curl -q -k -s -H "Content-Type: application/json" -X POST --data '{"id":1,"jsonrpc":"2.0","method":"net_version","params":[]}' $INDRA_ETH_PROVIDER | jq .result | tr -d '"'`"
fi

echo "eth provider: $INDRA_ETH_PROVIDER w chainId: $chainId"

if [[ "$chainId" == "1" ]]
then eth_mnemonic_name="${project}_mnemonic_mainnet"
elif [[ "$chainId" == "4" ]]
then eth_mnemonic_name="${project}_mnemonic_rinkeby"
elif [[ "$chainId" == "42" ]]
then eth_mnemonic_name="${project}_mnemonic_kovan"
elif [[ "$chainId" == "$ganache_chain_id" && "$INDRA_MODE" == "test" ]]
then
  eth_mnemonic="candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
  eth_mnemonic_name="${project}_mnemonic_ganache"
  new_secret "$eth_mnemonic_name" "$eth_mnemonic"
  eth_volume="chain_dev:"
  ethprovider_image="trufflesuite/ganache-cli:v6.4.5"
  pull_if_unavailable "$ethprovider_image"
  number_of_services=$(( $number_of_services + 1 ))
  ethprovider_service="
  ethprovider:
    image: $ethprovider_image
    command: [\"--db=/data\", \"--mnemonic=$eth_mnemonic\", \"--networkId=$ganache_chain_id\"]
    ports:
      - 8545:8545
    volumes:
      - $eth_volume/data
  "
  INDRA_ETH_PROVIDER="http://ethprovider:8545"
else echo "Eth network \"$chainId\" is not supported for $INDRA_MODE-mode deployments" && exit 1
fi

eth_contract_addresses="`cat address-book.json | tr -d ' \n\r'`"

########################################
## Docker Image Config

redis_url="redis://redis:6379"

database_image="postgres:9-alpine"
nats_image="nats:2.0.0-linux"
redis_image="redis:5-alpine"
pull_if_unavailable $database_image
pull_if_unavailable $nats_image
pull_if_unavailable $redis_image

if [[ "$INDRA_DOMAINNAME" != "localhost" ]]
then
  if [[ "$INDRA_MODE" == "prod" ]]
  then version="`cat package.json | jq .version | tr -d '"'`"
  elif [[ "$INDRA_MODE" == "staging" ]]
  then version="latest"
  else echo "Unknown mode ($INDRA_MODE) for domain: $INDRA_DOMAINNAME. Aborting" && exit 1
  fi
  node_image="$registry/${project}_node:$version"
  proxy_image="$registry/${project}_proxy:$version"
  relay_image="$registry/${project}_relay:$version"
  pull_if_unavailable $node_image
  pull_if_unavailable $proxy_image
  pull_if_unavailable $relay_image
else # local/testing mode, don't use images from registry
  node_image="${project}_node:latest"
  proxy_image="${project}_proxy:latest"
  relay_image="${project}_relay:latest"
fi

########################################
## Deploy according to configuration

echo "Deploying node image: $node_image to $INDRA_DOMAINNAME"

mkdir -p /tmp/$project
cat - > /tmp/$project/docker-compose.yml <<EOF
version: '3.4'

secrets:
  $db_secret:
    external: true
  $eth_mnemonic_name:
    external: true

volumes:
  certs:
  $db_volume:
  $eth_volume

services:
  $ethprovider_service

  proxy:
    image: $proxy_image
    environment:
      DOMAINNAME: $INDRA_DOMAINNAME
      EMAIL: $INDRA_EMAIL
      ETH_RPC_URL: $INDRA_ETH_PROVIDER
      MESSAGING_URL: http://relay:4223
      MODE: prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - certs:/etc/letsencrypt

  relay:
    image: $relay_image
    command: ["nats:$nats_port"]

  node:
    image: $node_image
    entrypoint: bash ops/entry.sh
    environment:
      INDRA_ETH_CONTRACT_ADDRESSES: '$eth_contract_addresses'
      INDRA_ETH_MNEMONIC_FILE: /run/secrets/$eth_mnemonic_name
      INDRA_ETH_RPC_URL: $INDRA_ETH_PROVIDER
      INDRA_LOG_LEVEL: $log_level
      INDRA_NATS_CLUSTER_ID: abc123
      INDRA_NATS_SERVERS: nats://nats:$nats_port
      INDRA_NATS_TOKEN: abc123
      INDRA_PG_DATABASE: $postgres_db
      INDRA_PG_HOST: $postgres_host
      INDRA_PG_PASSWORD_FILE: $postgres_password_file
      INDRA_PG_PORT: $postgres_port
      INDRA_PG_USERNAME: $postgres_user
      INDRA_PORT: $node_port
      INDRA_REDIS_URL: $redis_url
      NODE_ENV: production
    secrets:
      - $db_secret
      - $eth_mnemonic_name

  database:
    image: $database_image
    deploy:
      mode: global
    environment:
      POSTGRES_DB: $project
      POSTGRES_PASSWORD_FILE: $postgres_password_file
      POSTGRES_USER: $project
    secrets:
      - $db_secret
    volumes:
      - $db_volume:/var/lib/postgresql/data

  nats:
    command: -V
    image: $nats_image
    ports:
      - "4222:4222"

  redis:
    image: $redis_image
    ports:
      - "6379:6379"
EOF

docker stack deploy -c /tmp/$project/docker-compose.yml $project

echo -n "Waiting for the $project stack to wake up."
while [[ "`docker container ls | grep $project | wc -l | tr -d ' '`" != "$number_of_services" ]]
do echo -n "." && sleep 2
done
echo " Good Morning!"
