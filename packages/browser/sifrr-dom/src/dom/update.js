const { makeChildrenEqual } = require('./makeequal');
const { makeChildrenEqualKeyed } = require('./keyed');
const updateAttribute = require('./updateattribute');
const { evaluateBindings } = require('./bindings');
const { TEMPLATE, KEY_ATTR } = require('./constants');

function update(element, stateMap, changed = Object.keys(element._state || {})) {
  // console.log(changed);
  stateMap = stateMap || element.constructor.stateMap;
  // Update nodes
  const l = element._refs ? element._refs.length : 0;
  for (let i = 0; i < l; i++) {
    const data = stateMap[i].ref, dom = element._refs[i];

    // Fast path for text nodes
    if (data.type === 0) {
      // state node
      if (changed.indexOf(data.text) > -1 && dom.data != element._state[data.text]) dom.data = element._state[data.text];
      // if (dom.data != element._state[data.text]) dom.data = element._state[data.text];
      continue;
    } else if (data.type === 1) {
      // text node
      const newValue = evaluateBindings(data.text, element);
      if (dom.data != newValue) dom.data = newValue;
      continue;
    }

    // update attributes
    if (data.attributes) {
      for(let key in data.attributes) {
        if (key !== 'events') {
          let newValue;
          if (data.attributes[key].type === 0) {
            newValue = element._state[data.attributes[key].text];
          } else {
            newValue = evaluateBindings(data.attributes[key].text, element);
          }
          updateAttribute(dom, key, newValue);
        } else {
          if (!dom._sifrrEventSet) {
            for(let event in data.attributes.events) {
              dom[event] = evaluateBindings(data.attributes.events[event], element);
            }
            dom._root = element;
            dom._sifrrEventSet = true;
          }
        }
      }
    }

    if (data.text === undefined) continue;

    // update element
    const newValue = evaluateBindings(data.text, element);

    if (!newValue || newValue.length === 0) { dom.textContent = ''; }
    if (data.type === 3) {
      // repeat
      let key;
      // eslint-disable-next-line no-inner-declarations
      if (data.keyed && (key = dom.getAttribute(KEY_ATTR))) {
        makeChildrenEqualKeyed(dom, newValue, data.se.sifrrClone.bind(data.se), key);
      } else makeChildrenEqual(dom, newValue, data.se.sifrrClone.bind(data.se));
    } else {
      // html node
      let children, isNode = false;
      if (Array.isArray(newValue)) {
        children = newValue;
      } else if (newValue.content && newValue.content.nodeType === 11) {
        children = newValue.content.childNodes;
        isNode = true;
      } else if (newValue.nodeType) {
        children = [newValue];
      } else if (typeof newValue === 'string') {
        const temp = TEMPLATE();
        temp.innerHTML = newValue.toString();
        children = temp.content.childNodes;
        isNode = true;
      } else {
        children = Array.prototype.slice.call(newValue);
      }
      makeChildrenEqual(dom, children, undefined, isNode);
    }
  }
}

module.exports = update;
