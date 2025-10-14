// Knex configuration loader with TypeScript support
// This file registers ts-node and loads the TypeScript knexfile

require('ts-node/register');
module.exports = require('./knexfile.ts').default;