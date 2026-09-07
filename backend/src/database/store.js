const CollectionRecord = require('../models/CollectionRecord');

function sortByCreatedAtDesc(items) {
  return [...items].sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

async function readCollection(collection) {
  const records = await CollectionRecord.findAll({ where: { collection }, raw: true });
  return sortByCreatedAtDesc(records.map((record) => record.payload));
}

async function writeCollection(collection, value) {
  const transaction = await CollectionRecord.sequelize.transaction();
  try {
    await CollectionRecord.destroy({ where: { collection }, transaction });
    if (value.length) {
      await CollectionRecord.bulkCreate(value.map((payload) => ({
        key: `${collection}:${payload.id}`,
        id: String(payload.id),
        collection,
        payload,
      })), { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function listCollection(collection) {
  return readCollection(collection);
}

async function saveCollectionItem(collection, item) {
  const items = await readCollection(collection);
  const filtered = items.filter((existing) => existing.id !== item.id);
  filtered.unshift(item);
  await writeCollection(collection, filtered);
  return item;
}

async function deleteCollectionItem(collection, itemId) {
  const items = await readCollection(collection);
  const filtered = items.filter((item) => item.id !== itemId);
  await writeCollection(collection, filtered);
  return filtered;
}

async function findCollectionItem(collection, where = {}) {
  const items = await readCollection(collection);
  return items.find((item) => Object.entries(where).every(([key, value]) => item[key] === value)) || null;
}

module.exports = { readCollection, writeCollection, listCollection, saveCollectionItem, deleteCollectionItem, findCollectionItem };
