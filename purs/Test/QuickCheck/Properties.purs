module Test.QuickCheck.Properties where

import Data.Monoid
import Test.QuickCheck

verifySemigroup :: forall a. (Semigroup a, Eq a, Show a) => a -> a -> a -> Result
verifySemigroup a b c = let
  aplusb = a <> b
  bplusc = b <> c
  in aplusb <> c == a <> bplusc <?>
     "Property: a(bc) == (ab)c" ++
     "\n    a = " ++ show a ++
     "\n    b = " ++ show b ++
     "\n    c = " ++ show c ++
     "\n   ab = " ++ show aplusb ++
     "\n   bc = " ++ show bplusc ++
     "\n(ab)c = " ++ show (aplusb <> c) ++
     "\na(bc) = " ++ show (a <> bplusc) ++ "\n"

verifyMonoid :: forall a. (Monoid a, Eq a, Show a) => a -> Result
verifyMonoid a =
  (a <> mempty) == a <?>
     "Property: a+empty == a" ++
     "\n    a   = " ++ show a ++
     "\na+empty = " ++ show (a <> mempty) ++ "\n"
