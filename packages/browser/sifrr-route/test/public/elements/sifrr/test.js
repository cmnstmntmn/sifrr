class SifrrTest extends Sifrr.Dom.Element {
  static get template() {
    return Sifrr.Dom.html`
    <p>Simple lement testststfdgdh</p>
    {{JSON.stringify(this.state.route)}}
    `;
  }
}

Sifrr.Dom.register(SifrrTest);
