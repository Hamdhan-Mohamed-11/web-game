import SideRegalia from "./SideRegalia";

/**
 * The king and queen flanking the Genre Crown screen.
 *
 * Both source PNGs are already composed against one edge (the king occupies
 * the left of his frame, the queen the right of hers), so anchoring each to
 * its own side of the viewport has them facing inward toward the standings
 * without any cropping.
 */
export default function CrownRegalia() {
  return <SideRegalia left="/king.png" right="/queen.png" />;
}
