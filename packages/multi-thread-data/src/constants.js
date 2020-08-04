const LOCKED = 1;
const UNLOCKED = 0;
const LOCK_INDEX = 0;
const LENGTH_INDEX = 1;
const DATA_BYTE_OFFSET = (32 * 2) / 8;
const UNLOCK_TIMEOUT = Infinity; // later we may want to set it as an option

module.exports = {
  LOCKED, UNLOCKED, LOCK_INDEX, LENGTH_INDEX, DATA_BYTE_OFFSET, UNLOCK_TIMEOUT,
};
