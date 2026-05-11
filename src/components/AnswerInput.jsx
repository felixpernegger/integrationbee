import { useState } from 'react'
import katex from 'katex'

function renderPreview(latex) {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false })
  } catch {
    return null
  }
}

export default function AnswerInput({ onSubmit, disabled }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }

  const previewHtml = value.trim() ? renderPreview(value) : null

  return (
    <div className="answer-wrap">
      <form className="answer-form" onSubmit={handleSubmit}>
        <input
          className="answer-input"
          type="text"
          placeholder="Type your answer..."
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={disabled}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btn-check" type="submit" disabled={disabled || !value.trim()}>
          Check
        </button>
      </form>
      {previewHtml && (
        <div
          className="answer-preview"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  )
}
