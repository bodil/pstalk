module DOM where

import Control.Monad.Eff
import Data.Geom
import Data.Maybe

foreign import data DOM :: !
foreign import data Element :: *
foreign import data Event :: *

foreign import createElement
  "function createElement(tagName) {\
  \  return function() {\
  \    return document.createElement(tagName);\
  \  };\
  \}" :: forall e. String -> Eff (dom :: DOM | e) Element

foreign import setAttr
  "function setAttr(el) {\
  \  return function(attr) {\
  \    return function(value) {\
  \      return function() {\
  \        el.setAttribute(attr, value);\
  \      };\
  \    };\
  \  };\
  \}" :: forall e. Element -> String -> String -> Eff (dom :: DOM | e) Unit

foreign import appendChild
  "function appendChild(parent) {\
  \  return function(child) {\
  \    return function() {\
  \      return parent.appendChild(child);\
  \    }\
  \  }\
  \}" :: forall e. Element -> Element -> Eff (dom :: DOM | e) Unit

foreign import getElementById
  "function getElementById(id) {\
  \  return function() {\
  \    var el = document.getElementById(id);\
  \    \
  \  };\
  \}" :: forall e. String -> Eff (dom :: DOM | e) Element

foreign import elementOffset
  "function elementOffset(el) {\
  \  return function() {\
  \    var left = 0, top = 0, node = el;\
  \    if (node.offsetParent) {\
  \      do { left += node.offsetLeft; top += node.offsetTop;}\
  \      while (node = node.offsetParent);\
  \    }\
  \    return { x: left, y: top };\
  \  };\
  \}" :: forall e. Element -> Eff (dom :: DOM | e) Point

relativeTo :: forall e. Element -> Point -> Eff (dom :: DOM | e) Point
relativeTo el coord = do
  pos <- elementOffset el
  return $ subPairs coord pos
