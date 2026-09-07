const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/conn');

const CollectionRecord = sequelize.define('CollectionRecord', {
  key: {
    type: DataTypes.STRING(191),
    primaryKey: true,
    allowNull: false,
  },
  id: {
    type: DataTypes.STRING(191),
    allowNull: false,
  },
  collection: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: 'collection_records',
  indexes: [{ unique: true, fields: ['collection', 'id'] }],
  timestamps: true,
});

module.exports = CollectionRecord;
