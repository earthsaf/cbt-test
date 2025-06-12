import React from 'react';

function MCQTest({ questions, current, answers, setCurrent, setAnswers }) {
  if (!questions.length) return null;
  const q = questions[current];
  const handleOption = (qid, opt) => setAnswers({ ...answers, [qid]: opt });
  return (
    <div>
      <b>{current + 1}. {q.text}</b>
      <div>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleOption(q.id, opt)}
            style={{
              display: 'block',
              margin: '8px 0',
              background: answers[q.id] === opt ? '#cce' : '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: 8
            }}
          >
            {String.fromCharCode(97 + i)}. {opt}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => setCurrent(current - 1)} disabled={current === 0}>Previous</button>
        <button onClick={() => setCurrent(current + 1)} disabled={current === questions.length - 1}>Next</button>
      </div>
    </div>
  );
}

export default MCQTest; 