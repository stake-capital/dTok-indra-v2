FROM connext_builder:dev

COPY node_modules node_modules
COPY ops ops
COPY dist dist

ENTRYPOINT ["bash", "ops/prod.entry.sh"]
