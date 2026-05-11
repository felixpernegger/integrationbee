import { BlockMath } from 'react-katex'

export default function IntegralDisplay({ latex }) {
  return (
    <div className="integral-display">
      <BlockMath math={latex} />
    </div>
  )
}
