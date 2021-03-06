const Storage = require('./storage');

class IndexedDB extends Storage {
  constructor(options) {
    super(options);
  }

  _parsedData() {
    return this._tx('readonly', 'getAll').then((result) => this.parse(result));
  }

  _select(keys) {
    let ans = {};
    let promises = [];
    keys.forEach((key) => promises.push(this._tx('readonly', 'get', key).then((r) => ans[key] = this.parse(r))));
    return Promise.all(promises).then(() => ans);
  }

  _upsert(data) {
    let promises = [];
    for (let key in data) {
      let promise = this._tx('readonly', 'get', key).then((oldResult) => {
        if (oldResult && oldResult.key == key) {
          return this._tx('readwrite', 'put', { key: key, value: data[key] });
        } else {
          return this._tx('readwrite', 'add', { key: key, value: data[key] });
        }
      });
      promises.push(promise);
    }
    return Promise.all(promises);
  }

  _delete(keys) {
    let promises = [];
    keys.forEach((key) => promises.push(this._tx('readwrite', 'delete', key)));
    return Promise.all(promises);
  }

  _clear() {
    return this._tx('readwrite', 'clear');
  }

  _tx(scope, fn, params) {
    const me = this;
    return this.createStore(me.tableName).then((db) => {
      return new Promise((resolve, reject) => {
        let tx = db.transaction(me.tableName, scope).objectStore(me.tableName);
        let request = tx[fn].call(tx, params);
        request.onsuccess = (event) =>  resolve(event.target.result);
        request.onerror = (event) => reject(event.error);
      });
    });
  }

  get store() {
    return window.indexedDB;
  }

  createStore(table) {
    return new Promise((resolve, reject) => {
      const request = this.store.open(table, 1);
      request.onupgradeneeded = (event) => {
        let db = event.target.result;
        db.createObjectStore(table, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  parse(data) {
    let ans = {};
    if (Array.isArray(data)) {
      data.forEach((row) => {
        ans[row.key] = row.value;
      });
    } else if (data && data.value) {
      return data.value;
    } else {
      return undefined;
    }
    return ans;
  }

  static get type() {
    return 'indexeddb';
  }
}

module.exports = IndexedDB;
