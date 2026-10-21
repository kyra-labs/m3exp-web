// Brand images, served by astro:assets. The project logo is the repository's own
// (.github/assets/m3exp-logo.png, also in the README), the Kyra Labs logo a copy of
// kyra-labs/.github profile/assets/kyra-labs-logo.png. The favicons and web app manifest in
// public/ are the owner's favicon pack, served as they are.
import kyraLogo from '../assets/kyra-labs-logo.png';
import ogImage from '../assets/og-image.png';
import projectLogo from '../../../../.github/assets/m3exp-logo.png';

/**
 * The link preview image (og:image): the 1280 × 640 card inside
 * .github/assets/m3exp-social-preview.png, without its 100 px frame. Its URL carries a content
 * hash, so link previews refresh when the card changes.
 */
export const OG_IMAGE = {
  image: ogImage,
  alt: 'M3 Expressive Web by Kyra Labs: tokens, CSS, elements and React, faithful to Compose Material3.',
};

export { kyraLogo, projectLogo };
