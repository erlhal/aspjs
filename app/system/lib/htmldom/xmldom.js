/*!
 * XMLDOM
 * A minimal XML DOM implementation that supports a subset of the W3C standard
 *
 * Original Code: Copyright 2005 Google Inc. All Rights Reserved.
 * Original Author: Steffen Meschkat (mesch@google.com)
 *
 */

if (!this.lib_xmldom) this.lib_xmldom = lib_xmldom;
function lib_xmldom() {

  // Based on <http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247>
  var DOM_ELEMENT_NODE = 1;
  var DOM_ATTRIBUTE_NODE = 2;
  var DOM_TEXT_NODE = 3;
  var DOM_CDATA_SECTION_NODE = 4;
  var DOM_ENTITY_REFERENCE_NODE = 5;
  var DOM_ENTITY_NODE = 6;
  var DOM_PROCESSING_INSTRUCTION_NODE = 7;
  var DOM_COMMENT_NODE = 8;
  var DOM_DOCUMENT_NODE = 9;
  var DOM_DOCUMENT_TYPE_NODE = 10;
  var DOM_DOCUMENT_FRAGMENT_NODE = 11;
  var DOM_NOTATION_NODE = 12;

  // Traverses the element nodes in the DOM section underneath the given
  // node and invokes the given callbacks as methods on every element
  // node encountered. Function opt_pre is invoked before a node's
  // children are traversed; opt_post is invoked after they are
  // traversed. Traversal will not be continued if a callback function
  // returns boolean false.
  function domTraverseElements(node, opt_pre, opt_post, opt_all) {
    var ret;
    if (opt_pre) {
      ret = opt_pre.call(null, node);
      if (typeof ret == 'boolean' && !ret) {
        return false;
      }
    }
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType == DOM_ELEMENT_NODE || opt_all) {
        ret = domTraverseElements.call(null, c, opt_pre, opt_post, opt_all);
        if (typeof ret == 'boolean' && !ret) {
          return false;
        }
      }
    }
    if (opt_post) {
      ret = opt_post.call(null, node);
      if (typeof ret == 'boolean' && !ret) {
        return false;
      }
    }
  }

  // Helper Functions
  function xmlEnc(value) {
    var s = value + '';
    s = s.replace(/&/g, '&amp;');
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/</g, '&lt;');
    return s;
  }
  function xmlAttrEnc(value) {
    var s = value + '';
    s = s.replace(/&/g, '&amp;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/"/g, '&quot;');
    return s;
  }

  // Our W3C DOM Node implementation. We call it XNode to avoid conflicts.
  function XNode(type, name, opt_value, opt_owner) {
    this.attributes = [];
    this.childNodes = [];
    XNode.init.call(this, type, name, opt_value, opt_owner);
  }

  // Don't call as method, use apply() or call().
  XNode.init = function(type, name, value, owner) {
    this.nodeType = type - 0;
    this.nodeName = '' + name;
    this.tagName = (type == DOM_ELEMENT_NODE) ? name : null;
    this.nodeValue = '' + value;
    this.ownerDocument = owner;
    this.firstChild = null;
    this.lastChild = null;
    this.nextSibling = null;
    this.previousSibling = null;
    this.parentNode = null;
  };

  XNode.unused_ = [];

  XNode.recycle = function(node) {
    if (!node) {
      return;
    }
    if (node.constructor == XDocument) {
      XNode.recycle(node.documentElement);
      return;
    }
    if (node.constructor != this) {
      return;
    }
    XNode.unused_.push(node);
    for (var a = 0; a < node.attributes.length; ++a) {
      XNode.recycle(node.attributes[a]);
    }
    for (var c = 0; c < node.childNodes.length; ++c) {
      XNode.recycle(node.childNodes[c]);
    }
    node.attributes.length = 0;
    node.childNodes.length = 0;
    XNode.init.call(node, 0, '', '', null);
  };

  XNode.create = function(type, name, value, owner) {
    if (XNode.unused_.length > 0) {
      var node = XNode.unused_.pop();
      XNode.init.call(node, type, name, value, owner);
      return node;
    } else {
      return new XNode(type, name, value, owner);
    }
  };

  XNode.prototype.appendChild = function(node) {
    // firstChild
    if (this.childNodes.length == 0) {
      this.firstChild = node;
    }
    // previousSibling
    node.previousSibling = this.lastChild;
    // nextSibling
    node.nextSibling = null;
    if (this.lastChild) {
      this.lastChild.nextSibling = node;
    }
    // parentNode
    node.parentNode = this;
    // lastChild
    this.lastChild = node;
    // childNodes
    this.childNodes.push(node);
  };


  XNode.prototype.replaceChild = function(newNode, oldNode) {
    if (oldNode == newNode) {
      return;
    }

    for (var i = 0; i < this.childNodes.length; ++i) {
      if (this.childNodes[i] == oldNode) {
        this.childNodes[i] = newNode;
        var p = oldNode.parentNode;
        oldNode.parentNode = null;
        newNode.parentNode = p;
        p = oldNode.previousSibling;
        oldNode.previousSibling = null;
        newNode.previousSibling = p;
        if (newNode.previousSibling) {
          newNode.previousSibling.nextSibling = newNode;
        }
        p = oldNode.nextSibling;
        oldNode.nextSibling = null;
        newNode.nextSibling = p;
        if (newNode.nextSibling) {
          newNode.nextSibling.previousSibling = newNode;
        }
        if (this.firstChild == oldNode) {
          this.firstChild = newNode;
        }
        if (this.lastChild == oldNode) {
          this.lastChild = newNode;
        }
        break;
      }
    }
  };

  XNode.prototype.insertBefore = function(newNode, oldNode) {
    if (oldNode == newNode) {
      return;
    }
    if (oldNode.parentNode != this) {
      return;
    }
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }
    var newChildren = [];
    for (var i = 0; i < this.childNodes.length; ++i) {
      var c = this.childNodes[i];
      if (c == oldNode) {
        newChildren.push(newNode);
        newNode.parentNode = this;
        newNode.previousSibling = oldNode.previousSibling;
        oldNode.previousSibling = newNode;
        if (newNode.previousSibling) {
          newNode.previousSibling.nextSibling = newNode;
        }
        newNode.nextSibling = oldNode;
        if (this.firstChild == oldNode) {
          this.firstChild = newNode;
        }
      }
      newChildren.push(c);
    }
    this.childNodes = newChildren;
  };

  XNode.prototype.removeChild = function(node) {
    var newChildren = [];
    for (var i = 0; i < this.childNodes.length; ++i) {
      var c = this.childNodes[i];
      if (c != node) {
        newChildren.push(c);
      } else {
        if (c.previousSibling) {
          c.previousSibling.nextSibling = c.nextSibling;
        }
        if (c.nextSibling) {
          c.nextSibling.previousSibling = c.previousSibling;
        }
        if (this.firstChild == c) {
          this.firstChild = c.nextSibling;
        }
        if (this.lastChild == c) {
          this.lastChild = c.previousSibling;
        }
      }
    }
    this.childNodes = newChildren;
  };

  XNode.prototype.hasAttributes = function() {
    return this.attributes.length > 0;
  };

  XNode.prototype.setAttribute = function(name, value) {
    for (var i = 0; i < this.attributes.length; ++i) {
      if (this.attributes[i].nodeName == name) {
        this.attributes[i].nodeValue = '' + value;
        return;
      }
    }
    this.attributes.push(XNode.create(DOM_ATTRIBUTE_NODE, name, value, this));
  };

  XNode.prototype.getAttribute = function(name) {
    for (var i = 0; i < this.attributes.length; ++i) {
      if (this.attributes[i].nodeName == name) {
        return this.attributes[i].nodeValue;
      }
    }
    return null;
  };

  XNode.prototype.hasAttribute = function(name) {
    for (var i = 0; i < this.attributes.length; ++i) {
      if (this.attributes[i].nodeName == name) {
        return true;
      }
    }
    return null;
  };

  XNode.prototype.removeAttribute = function(name) {
    var a = [];
    for (var i = 0; i < this.attributes.length; ++i) {
      if (this.attributes[i].nodeName != name) {
        a.push(this.attributes[i]);
      }
    }
    this.attributes = a;
  };

  XNode.prototype.getElementsByTagName = function(name) {
    var ret = [], self = this;
    if ("*" == name) {
      domTraverseElements(this, function(node) {
        if (self == node) return;
        ret.push(node);
      }, null);
    } else {
      domTraverseElements(this, function(node) {
        if (self == node) return;
        if (node.nodeName == name) {
          ret.push(node);
        }
      }, null);
    }
    return ret;
  };

  XNode.prototype.getElementsByAttribute = function(name, val) {
    var ret = [], self = this;
    domTraverseElements(this, function(node) {
      if (self == node) return;
      if (node.getAttribute(name) == val) {
        ret.push(node);
      }
    }, null);
    return ret;
  };

  XNode.prototype.getElementById = function(id) {
    var ret = null;
    domTraverseElements(this, function(node) {
      if (node.getAttribute('id') == id) {
        ret = node;
        return false;
      }
    }, null);
    return ret;
  };

  XNode.prototype.traverseElements = function(opt_pre, opt_post, opt_all) {
    domTraverseElements(this, opt_pre, opt_post, opt_all);
  };

  XNode.prototype.text = function() {
    var text = [];
    domTraverseElements(this, function(node) {
      if (node.nodeType == DOM_TEXT_NODE) {
        text.push(node.nodeValue);
      }
    }, null, true);
    return text.join('');
  };

  XNode.prototype.xml = function(emptyElements, noencElements) {
    var xml = [], empty = emptyElements || {}, noenc = noencElements || {};
    domTraverseElements(this, function(node) {
      if (node.nodeType == DOM_ELEMENT_NODE) {
        var attribs = [];
        for (var i = 0; i < node.attributes.length; ++i) {
          var attr = node.attributes[i];
          attribs.push(' ' + attr.nodeName + '="' + xmlAttrEnc(attr.nodeValue) + '"');
        }
        xml.push('<' + node.nodeName + attribs.join('') + (node.firstChild || !empty[node.nodeName] ? '' : '/') + '>');
      } else
      if (node.nodeType == DOM_TEXT_NODE) {
        if (node.parentNode && noenc[node.parentNode.tagName]) {
          xml.push(node.nodeValue);
        } else {
          xml.push(xmlEnc(node.nodeValue));
        }
      } else
      if (node.nodeType == DOM_CDATA_SECTION_NODE) {
        xml.push('<![CDATA[' + node.nodeValue + ']]>');
      } else
      if (node.nodeType == DOM_COMMENT_NODE) {
        xml.push('<' + '!--' + node.nodeValue + '--' + '>');
      }
    }, function(node) {
      if (node.nodeType == DOM_ELEMENT_NODE) {
        if (node.firstChild || !empty[node.nodeName]) {
          xml.push('</' + node.nodeName + '>');
        }
      }
    }, true);
    return xml.join('');
  };


  function XDocument() {
    // NOTE: Acocording to the DOM Spec, ownerDocument of a document node is null.
    XNode.call(this, DOM_DOCUMENT_NODE, '#document', null, null);
    this.documentElement = null;
  }

  XDocument.prototype = new XNode(DOM_DOCUMENT_NODE, '#document');

  XDocument.prototype.clear = function() {
    XNode.recycle(this.documentElement);
    this.documentElement = null;
  };

  XDocument.prototype.appendChild = function(node) {
    XNode.prototype.appendChild.call(this, node);
    this.documentElement = this.childNodes[0];
  };

  XDocument.prototype.createElement = function(name) {
    return XNode.create(DOM_ELEMENT_NODE, name, null, this);
  };

  XDocument.prototype.createDocumentFragment = function() {
    return XNode.create(DOM_DOCUMENT_FRAGMENT_NODE, '#document-fragment', null, this);
  };

  XDocument.prototype.createTextNode = function(value) {
    return XNode.create(DOM_TEXT_NODE, '#text', value, this);
  };

  XDocument.prototype.createAttribute = function(name) {
    return XNode.create(DOM_ATTRIBUTE_NODE, name, null, this);
  };

  XDocument.prototype.createComment = function(data) {
    return XNode.create(DOM_COMMENT_NODE, '#comment', data, this);
  };

  XDocument.prototype.createCDATASection = function(data) {
    return XNode.create(DOM_CDATA_SECTION_NODE, '#cdata-section', data, this);
  };

  return {
    Document: XDocument,
    Node: XNode
  };

}