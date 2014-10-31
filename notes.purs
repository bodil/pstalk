-- list

module My.Data.List where

data List a = Cons a (List a) | Nil

map :: forall a b. (a -> b) -> List a -> List b
map f Nil = Nil
map f (Cons a d) = Cons (f a) (map f d)

instance functorList :: Functor List where
  (<$>) = map

instance showList :: (Show a) => Show (List a) where
  show (Cons x xs) = (show x) ++ " : " ++ show xs
  show Nil = "Nil"

-- pair

module My.Data.Geom where

import Data.Monoid

data Pair = Pair Number Number

addPairs :: Pair -> Pair -> Pair
addPairs (Pair x1 y1) (Pair x2 y2) = Pair (x1+x2) (y1+y2)

instance eqPair :: Eq Pair where
  (==) (Pair x1 y1) (Pair x2 y2) = (x1 == x2) && (y1 == y2)
  (/=) a b = not (a == b)

instance semigroupPair :: Semigroup Pair where
  (<>) = addPairs

instance monoidPair :: Monoid Pair where
  mempty = Pair 0 0

instance showPair :: Show Pair where
  show (Pair x y) = "(" ++ round x ++ ", " ++ round y ++ ")"
    where round a = show $ ((a * 10000) | 0) / 10000

instance arbPair :: Arbitrary Pair where
  arbitrary = do
    x <- uniform
    y <- uniform
    return $ Pair x y

pairIsSemigroup :: Pair -> Pair -> Pair -> Result
pairIsSemigroup = verifySemigroup

-- game

module Game where

import Control.Monad.Eff
import Signal
import Signal.Time
import Signal.DOM
import DOM

type GameObject =
  { id :: String, css :: String
  , x :: Number, y :: Number
  , baseX :: Number, baseY :: Number
  , vx :: Number, vy :: Number }

type Bounds = { x1 :: Number, x2 :: Number, y1 :: Number, y2 :: Number }
bounds :: forall a. GameObject -> Bounds
bounds a = { x1: a.x + a.baseX, y1: a.y + a.baseY
           , x2: a.x + a.baseX + 64, y2: a.y + a.baseY + 64 }
intersects :: forall a b. GameObject -> GameObject -> Boolean
intersects a b = not ((b'.x1 > a'.x2) || (b'.x2 < a'.x1) || (b'.y1 > a'.y2) || (b'.y2 < a'.y1))
  where a' = bounds a
        b' = bounds b

foreign import renderObject
  "function renderObject(o) {\
  \  return function() {\
  \    var el = document.getElementById(o.id);\
  \    el.setAttribute('class', o.css);\
  \    el.setAttribute('style', 'left: '\
  \      + (o.baseX + (o.x | 0))\
  \      + 'px; top: '\
  \      + (o.baseY + (o.y | 0)) + 'px');\
  \    return {};\
  \  }\
  \}" :: forall e. GameObject -> Eff (dom :: DOM | e) Unit

frameRate :: Signal Number
frameRate = every 33

ground :: Signal GameObject
ground = frameRate ~> \n ->
  { id: "ground", css: ""
  , x: ((n / 33) % 64) * -8, y: 0
  , baseX: -128, baseY: 384
  , vx: 0, vy: 0 }

gravity :: GameObject -> GameObject
gravity o = o { vy = o.vy + 0.98 }

velocity :: GameObject -> GameObject
velocity o = o { x = o.x + o.vx
               , y = o.y + o.vy }

solidGround :: GameObject -> GameObject
solidGround o =
  if o.y >= 0
  then o { y = 0, vy = 0, css = "" }
  else o

jump :: Boolean -> GameObject -> GameObject
jump true p@{ y = 0 } = p { vy = -20, css = "jumping" }
jump _ p = p

initialPinkie :: GameObject
initialPinkie =
  { id: "pinkie", css: ""
  , x: 0, y: 0
  , baseX: 0, baseY: 276
  , vx: 0, vy: 0 }

pinkieLogic :: Boolean -> GameObject -> GameObject
pinkieLogic spaceBar p = solidGround
  $ gravity
  $ velocity
  $ jump spaceBar p

pinkie :: Signal Boolean -> Signal GameObject
pinkie keys = foldp pinkieLogic initialPinkie
                (sampleOn frameRate keys)

initialCoin :: GameObject
initialCoin =
  { id: "coin", css: ""
  , x: 1000, y: 40
  , baseX: 0, baseY: 0
  , vx: -8, vy: 0 }

reset :: GameObject -> GameObject -> GameObject
reset i o | o.x < -100 || o.y < -100 = i
reset _ o = o

coinLogic :: GameObject -> GameObject -> GameObject
coinLogic _ c | c.vy < 0 =
  velocity $ reset initialCoin c { vy = c.vy * 2}
coinLogic pinkie c | intersects pinkie c =
  c { vx = 0, vy = -1 }
coinLogic pinkie c =
  velocity $ reset initialCoin c

coin :: Signal GameObject -> Signal GameObject
coin = foldp coinLogic initialCoin

main :: Eff (dom :: DOM) Unit
main = do
  spaceBar <- keyPressed 32
  let p = pinkie spaceBar
  runSignal $ ground ~> renderObject
  runSignal $ p ~> renderObject
  runSignal $ coin p ~> renderObject
