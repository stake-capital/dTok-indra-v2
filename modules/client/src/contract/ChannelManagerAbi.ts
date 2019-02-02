export default {
  "contractName": "ChannelManager",
  "abi": [
    {
      "constant": true,
      "inputs": [],
      "name": "totalChannelWei",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "totalChannelToken",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "hub",
      "outputs": [
        {
          "name": "",
          "type": "address"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "",
          "type": "address"
        }
      ],
      "name": "channels",
      "outputs": [
        {
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "name": "threadCount",
          "type": "uint256"
        },
        {
          "name": "exitInitiator",
          "type": "address"
        },
        {
          "name": "channelClosingTime",
          "type": "uint256"
        },
        {
          "name": "status",
          "type": "uint8"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "NAME",
      "outputs": [
        {
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "approvedToken",
      "outputs": [
        {
          "name": "",
          "type": "address"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "challengePeriod",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "VERSION",
      "outputs": [
        {
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "_hub",
          "type": "address"
        },
        {
          "name": "_challengePeriod",
          "type": "uint256"
        },
        {
          "name": "_tokenAddress",
          "type": "address"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "payable": true,
      "stateMutability": "payable",
      "type": "fallback"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "name": "weiAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "tokenAmount",
          "type": "uint256"
        }
      ],
      "name": "DidHubContractWithdraw",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "senderIdx",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "pendingWeiUpdates",
          "type": "uint256[4]"
        },
        {
          "indexed": false,
          "name": "pendingTokenUpdates",
          "type": "uint256[4]"
        },
        {
          "indexed": false,
          "name": "txCount",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "name": "threadCount",
          "type": "uint256"
        }
      ],
      "name": "DidUpdateChannel",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "senderIdx",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "txCount",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "name": "threadCount",
          "type": "uint256"
        }
      ],
      "name": "DidStartExitChannel",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "senderIdx",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "txCount",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "name": "threadCount",
          "type": "uint256"
        }
      ],
      "name": "DidEmptyChannel",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "name": "user",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "threadId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "senderAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "txCount",
          "type": "uint256"
        }
      ],
      "name": "DidStartExitThread",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "threadId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "senderAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "txCount",
          "type": "uint256"
        }
      ],
      "name": "DidChallengeThread",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "name": "user",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "threadId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "senderAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "channelWeiBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "channelTokenBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "channelTxCount",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "channelThreadRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "name": "channelThreadCount",
          "type": "uint256"
        }
      ],
      "name": "DidEmptyThread",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "senderAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "weiAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "name": "channelWeiBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "channelTokenBalances",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "channelTxCount",
          "type": "uint256[2]"
        },
        {
          "indexed": false,
          "name": "channelThreadRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "name": "channelThreadCount",
          "type": "uint256"
        }
      ],
      "name": "DidNukeThreads",
      "type": "event"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "weiAmount",
          "type": "uint256"
        },
        {
          "name": "tokenAmount",
          "type": "uint256"
        }
      ],
      "name": "hubContractWithdraw",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "getHubReserveWei",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "getHubReserveTokens",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        },
        {
          "name": "recipient",
          "type": "address"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "pendingWeiUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "pendingTokenUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "txCount",
          "type": "uint256[2]"
        },
        {
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "name": "threadCount",
          "type": "uint256"
        },
        {
          "name": "timeout",
          "type": "uint256"
        },
        {
          "name": "sigUser",
          "type": "string"
        }
      ],
      "name": "hubAuthorizedUpdate",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "recipient",
          "type": "address"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "pendingWeiUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "pendingTokenUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "txCount",
          "type": "uint256[2]"
        },
        {
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "name": "threadCount",
          "type": "uint256"
        },
        {
          "name": "timeout",
          "type": "uint256"
        },
        {
          "name": "sigHub",
          "type": "string"
        }
      ],
      "name": "userAuthorizedUpdate",
      "outputs": [],
      "payable": true,
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        }
      ],
      "name": "startExit",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address[2]"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "pendingWeiUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "pendingTokenUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "txCount",
          "type": "uint256[2]"
        },
        {
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "name": "threadCount",
          "type": "uint256"
        },
        {
          "name": "timeout",
          "type": "uint256"
        },
        {
          "name": "sigHub",
          "type": "string"
        },
        {
          "name": "sigUser",
          "type": "string"
        }
      ],
      "name": "startExitWithUpdate",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address[2]"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "pendingWeiUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "pendingTokenUpdates",
          "type": "uint256[4]"
        },
        {
          "name": "txCount",
          "type": "uint256[2]"
        },
        {
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "name": "threadCount",
          "type": "uint256"
        },
        {
          "name": "timeout",
          "type": "uint256"
        },
        {
          "name": "sigHub",
          "type": "string"
        },
        {
          "name": "sigUser",
          "type": "string"
        }
      ],
      "name": "emptyChannelWithChallenge",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        }
      ],
      "name": "emptyChannel",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        },
        {
          "name": "sender",
          "type": "address"
        },
        {
          "name": "receiver",
          "type": "address"
        },
        {
          "name": "threadId",
          "type": "uint256"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "proof",
          "type": "bytes"
        },
        {
          "name": "sig",
          "type": "string"
        }
      ],
      "name": "startExitThread",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        },
        {
          "name": "threadMembers",
          "type": "address[2]"
        },
        {
          "name": "threadId",
          "type": "uint256"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "proof",
          "type": "bytes"
        },
        {
          "name": "sig",
          "type": "string"
        },
        {
          "name": "updatedWeiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "updatedTokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "updatedTxCount",
          "type": "uint256"
        },
        {
          "name": "updateSig",
          "type": "string"
        }
      ],
      "name": "startExitThreadWithUpdate",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "sender",
          "type": "address"
        },
        {
          "name": "receiver",
          "type": "address"
        },
        {
          "name": "threadId",
          "type": "uint256"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "txCount",
          "type": "uint256"
        },
        {
          "name": "sig",
          "type": "string"
        }
      ],
      "name": "challengeThread",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        },
        {
          "name": "sender",
          "type": "address"
        },
        {
          "name": "receiver",
          "type": "address"
        },
        {
          "name": "threadId",
          "type": "uint256"
        },
        {
          "name": "weiBalances",
          "type": "uint256[2]"
        },
        {
          "name": "tokenBalances",
          "type": "uint256[2]"
        },
        {
          "name": "proof",
          "type": "bytes"
        },
        {
          "name": "sig",
          "type": "string"
        }
      ],
      "name": "emptyThread",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        }
      ],
      "name": "nukeThreads",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getChannelBalances",
      "outputs": [
        {
          "name": "weiHub",
          "type": "uint256"
        },
        {
          "name": "weiUser",
          "type": "uint256"
        },
        {
          "name": "weiTotal",
          "type": "uint256"
        },
        {
          "name": "tokenHub",
          "type": "uint256"
        },
        {
          "name": "tokenUser",
          "type": "uint256"
        },
        {
          "name": "tokenTotal",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getChannelDetails",
      "outputs": [
        {
          "name": "txCountGlobal",
          "type": "uint256"
        },
        {
          "name": "txCountChain",
          "type": "uint256"
        },
        {
          "name": "threadRoot",
          "type": "bytes32"
        },
        {
          "name": "threadCount",
          "type": "uint256"
        },
        {
          "name": "exitInitiator",
          "type": "address"
        },
        {
          "name": "channelClosingTime",
          "type": "uint256"
        },
        {
          "name": "status",
          "type": "uint8"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ],
}
