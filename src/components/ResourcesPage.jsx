export default function ResourcesPage() {
  return (
    <div className="main">
      <div className="card resources-card">
        <h2 className="resources-title">Resources</h2>
        <div className="resources-content">
          <p>
            For general information about integration bees, see{' '}
            <a href="https://en.wikipedia.org/wiki/Integration_Bee" target="_blank" rel="noopener noreferrer">Wikipedia</a>.
          </p>
          <p>
            To learn the basics of integration (power rule, u-sub, integration by parts, …), it's best to first understand the surrounding material and refer to virtually any undergraduate analysis/calculus textbook. If trigonometric substitution is not covered, one may refer to{' '}
            <a href="https://en.wikipedia.org/wiki/Trigonometric_substitution" target="_blank" rel="noopener noreferrer">this</a>{' '}
            nice Wikipedia article or various other online resources.
          </p>
          <p>
            For intermediate techniques (Weierstraß substitution, reflection, more advanced trigonometric identities, …), there is{' '}
            <a href="https://integration.soc.srcf.net/UK_University_Integration_Bee_Techniques_Guide.pdf" target="_blank" rel="noopener noreferrer">this</a>{' '}
            handout from Vishal Gupta and Alfie Jones from the UK Integration Bee. For most integration bees, the material covered in there will be enough to (at least in theory) solve almost all integrals.
          </p>
          <p>
            Information about advanced integration bee methods (Glasser's master theorem, Taylor series, …) unfortunately is rather rare and hard to find on the internet. However, one extensive resource is{' '}
            <a href="https://www.youtube.com/playlist?list=PL12MfBleRF0rfMCmWWLMNfIrD6arK3FYg" target="_blank" rel="noopener noreferrer">this</a>{' '}
            playlist on YouTube by Yuepeng Alex Yang (also available for other levels).
          </p>
          <p>
            For a daily challenge, there is also the{' '}
            <a href="https://dailyintegral.com" target="_blank" rel="noopener noreferrer">Daily Integral page</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
