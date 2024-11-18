function convertPayloadToType(payload) {
  let payloadConstructed = {};

  for (const [key, value] of Object.entries(payload.properties)) {
    payloadConstructed = {
      ...payloadConstructed,
      [key]: value.type,
    };
  }

  return payloadConstructed;
}

module.exports = { convertPayloadToType };
