import { materialShape } from '@kyralabs/m3e-shapes';
import { LoadingIndicator } from '@kyralabs/m3exp-web/react';

const polygons = [materialShape('Heart'), materialShape('Cookie9Sided'), materialShape('Flower')];

export default function Shapes() {
  return <LoadingIndicator contained polygons={polygons} aria-label="Loading" />;
}
