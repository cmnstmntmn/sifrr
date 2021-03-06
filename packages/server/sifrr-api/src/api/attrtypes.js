const flatten = require('./flatten');
const filter = require('../utils/filterobject');

module.exports = (attrs, required = [], allowed = []) => {
  if (allowed.length > 0) attrs = filter(attrs, (attr) => allowed.indexOf(attr) >= 0 || required.indexOf(attr) >= 0);
  let ret = {};
  for (let attr in attrs) {
    let bang = required.indexOf(attr) >= 0 ? true : false;
    let type;
    if (attrs[attr].returnType) {
      type = attrs[attr].returnType;
    } else if (!attrs[attr].type) {
      type = attrs[attr];
    } else if (attrs[attr].type.constructor.name === 'GraphQLList') {
      type = `[${attrs[attr].type.ofType.name}]`;
    } else if (attrs[attr].type.constructor.name === 'GraphQLNonNull') {
      type = attrs[attr].type.ofType.name;
      bang = true;
    } else if (attrs[attr].type.name) {
      type = attrs[attr].type.name;
    } else if (attrs[attr].type.ofType && attrs[attr].type.ofType.name) {
      type = attrs[attr].type.ofType.name;
    } else {
      type = attrs[attr].type;
    }
    const args = attrs[attr].args ? `(${flatten(attrs[attr].args)})` : '';
    ret[attr + args] = { type: type + (bang ? '!' : '') };
    if (attrs[attr].description) ret[attr + args].description = attrs[attr].description;
  }
  return ret;
};
