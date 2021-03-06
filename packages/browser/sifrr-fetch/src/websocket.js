class WebSocket {
  constructor(url, protocol, fallback = () => Promise.reject(Error('No fallback provided for websocket failure.'))) {
    this.url = url;
    this.protocol = protocol;
    this._fallback = !window.WebSocket;
    this.fallback = fallback;
    this.id = 1;
    this._requests = {};
    this._openSocket();
  }

  send(data, type) {
    if (data.constructor === ({}).constructor) {
      return this.sendJSON(data, type);
    } else {
      return this.sendRaw(data, this.id++);
    }
  }

  sendJSON(data, type = 'JSON') {
    const message = {};
    message.sifrrQueryType = type;
    message.sifrrQueryId = this.id++;
    message.data = data;
    return this.sendRaw(JSON.stringify(message), message.sifrrQueryId, data);
  }

  async sendRaw(message, id, original = message) {
    if (this._fallback) return this.fallback(original);
    const sock = await this._openSocket();
    if (!sock) return this.fallback(original);
    this.ws.send(message);
    const ret = new Promise((res) => {
      this._requests[id] = {
        res: (v) => {
          delete this._requests[id];
          res(v);
        },
        original
      };
    });
    return ret;
  }

  _openSocket() {
    if (!this.ws) {
      this.ws = new window.WebSocket(this.url, this.protocol);
      this.ws.onopen = this.onopen.bind(this);
      this.ws.onerror = this.onerror.bind(this);
      this.ws.onclose = this.onclose.bind(this);
      this.ws.onmessage = this._onmessage.bind(this);
    } else if (this.ws.readyState === this.ws.OPEN) {
      return Promise.resolve(true);
    } else if (this.ws.readyState !== this.ws.CONNECTING) {
      this.ws = null;
      return this._openSocket();
    }
    const me = this;
    return new Promise(res => {
      function waiting() {
        if (me.ws.readyState === me.ws.CONNECTING) {
          window.requestAnimationFrame(waiting);
        } else if (me.ws.readyState !== me.ws.OPEN) {
          window.console.error(`Failed to open socket on ${me.url}`);
          res(false);
        } else {
          res(true);
        }
      }
      window.requestAnimationFrame(waiting);
    });
  }

  onerror() {
    this._fallback = !!this.fallback;
    for (let r in this._requests) {
      const req = this._requests[r];
      this.fallback(req.data).then(result => req.res(result));
    }
  }

  onopen() {}

  onclose() {}

  close() {
    this.ws.close();
  }

  _onmessage(event) {
    const data = JSON.parse(event.data);
    if (data.sifrrQueryId) this._requests[data.sifrrQueryId].res(data.data);
    delete this._requests[data.sifrrQueryId];
    this.onmessage(event);
  }

  onmessage() {}
}

module.exports = WebSocket;
