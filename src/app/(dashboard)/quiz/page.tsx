'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import type { Quiz, QuizQuestion, QuizSubmission, Profile } from '@/lib/types'
import { fmtDate } from '@/lib/types'

export default function QuizPage() {
  const { profile, isAdmin } = useAuth()
  const [tab, setTab] = useState<'list' | 'results'>('list')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null)
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null)
  const [reviewSub, setReviewSub] = useState<QuizSubmission | null>(null)
  const { toast, show, clear } = useToast()

  async function load() {
    const supabase = createClient()
    const [qRes, sRes, pRes] = await Promise.all([
      supabase.from('quizzes').select('*, quiz_questions(*), quiz_assignments(*), quiz_submissions(*)').order('created_at', { ascending: false }),
      supabase.from('quiz_submissions').select('*, profiles(*), quizzes(*)').order('submitted_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name')
    ])
    setQuizzes(qRes.data ?? [])
    setSubmissions(isAdmin ? (sRes.data ?? []) : (sRes.data ?? []).filter(s => s.user_id === profile?.id))
    setProfiles(pRes.data ?? [])
  }

  useEffect(() => { if (profile) load() }, [profile])

  async function deleteQuiz(q: Quiz) {
    if (!confirm(`Xóa bài kiểm tra "${q.title}"?`)) return
    const supabase = createClient()
    await supabase.from('quizzes').delete().eq('id', q.id)
    show('Đã xóa bài kiểm tra')
    load()
  }

  const mySubmissionIds = new Set(submissions.filter(s => s.user_id === profile?.id).map(s => s.quiz_id))

  if (takingQuiz) {
    return <QuizTake quiz={takingQuiz} profileId={profile?.id ?? ''} onDone={() => { setTakingQuiz(null); load() }} />
  }

  if (reviewSub) {
    return <QuizReview sub={reviewSub} onBack={() => setReviewSub(null)} />
  }

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Bài kiểm tra</div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditQuiz(null); setShowCreateModal(true) }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
            Tạo bài kiểm tra
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: '.6rem 1.2rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap', background: 'var(--sf)', borderBottom: '1px solid var(--bd)' }}>
        {[{ v: 'list', l: 'Danh sách bài' }, { v: 'results', l: 'Kết quả & Báo cáo' }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as typeof tab)}
            style={{ border: 'none', borderRadius: 20, padding: '.28rem .8rem', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t.v ? 'var(--green)' : 'var(--gl)', color: tab === t.v ? '#fff' : 'var(--gd)' }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div style={{ padding: '.85rem 1.2rem' }}>
          {quizzes.map(q => {
            const done = mySubmissionIds.has(q.id)
            const mySub = submissions.find(s => s.quiz_id === q.id && s.user_id === profile?.id)
            const assignedUsers = (q.quiz_assignments ?? []).map(a => profiles.find(p => p.id === a.user_id)).filter(Boolean) as typeof profiles
            const mySubCount = submissions.filter(s => s.quiz_id === q.id && s.user_id === profile?.id).length
            const ps = q.pass_score
            return (
              <div key={q.id} style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', marginBottom: '.75rem', overflow: 'hidden' }}>
                <div style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: '.25rem' }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--mu)', display: 'flex', flexWrap: 'wrap', gap: '.3rem', alignItems: 'center', marginBottom: '.2rem' }}>
                      <span>{q.quiz_questions?.length ?? 0} câu</span>
                      <span>·</span>
                      <span>{q.time_limit} phút</span>
                      <span>·</span>
                      {assignedUsers.length > 0 ? (
                        <span style={{ display: 'inline-flex', gap: '.2rem', alignItems: 'center' }}>
                          {assignedUsers.slice(0, 4).map(p => (
                            <span key={p.id} className="av-xs" style={{ background: p.avatar_color, width: 18, height: 18, fontSize: 8 }}>{p.full_name.slice(0,2).toUpperCase()}</span>
                          ))}
                          {assignedUsers.length > 4 && <span style={{ fontSize: 11 }}>+{assignedUsers.length - 4}</span>}
                        </span>
                      ) : <span>Tất cả</span>}
                    </div>
                    {q.description && <div style={{ fontSize: 12.5, color: 'var(--mu)' }}>{q.description}</div>}
                    {mySub && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.4rem' }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: mySub.score >= ps ? 'var(--gd)' : 'var(--red)' }}>{mySub.score}%</span>
                        <span className={`badge ${mySub.score >= ps ? 'badge-green' : 'badge-red'}`}>{mySub.score >= ps ? 'Đạt' : 'Không đạt'}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--mu)' }}>{mySubCount}/3 lần đã làm</span>
                      </div>
                    )}
                    {!mySub && !isAdmin && <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: '.3rem' }}>Chưa làm bài</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                    {(!done || isAdmin) && (
                      <button className="btn btn-primary btn-sm" onClick={() => setTakingQuiz(q)}>Làm bài</button>
                    )}
                    {done && mySub && !isAdmin && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setReviewSub(mySub)}>Xem kết quả</button>
                    )}
                    {isAdmin && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditQuiz(q); setShowCreateModal(true) }}>Sửa</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteQuiz(q)}>Xóa</button>
                      </>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, background: 'var(--bg)', display: 'flex', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(ps - 10, 0)}%`, background: '#F7C1C1' }} title={`F: 0-${Math.max(ps-10,0)}%`} />
                  <div style={{ width: '10%', background: '#FAEEDA' }} title={`C: ${Math.max(ps-10,0)}-${ps}%`} />
                  <div style={{ width: `${90 - ps}%`, background: '#B8E6D8' }} title={`B: ${ps}-90%`} />
                  <div style={{ width: '10%', background: 'var(--green)' }} title="A: 90-100%" />
                </div>
                <div style={{ display: 'flex', fontSize: 10, color: 'var(--mu)', padding: '.18rem .75rem', justifyContent: 'space-between' }}>
                  <span>0%</span>
                  <span style={{ color: 'var(--red)' }}>Đạt: {ps}%</span>
                  <span>100%</span>
                </div>
              </div>
            )
          })}
          {quizzes.length === 0 && (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 15v.5"/></svg>
              <p>Chưa có bài kiểm tra</p>
            </div>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div style={{ padding: '.85rem 1.2rem' }}>
          {submissions.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.65rem 1rem', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 10, marginBottom: '.55rem' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0, background: s.score >= (s.quizzes?.pass_score ?? 70) ? 'var(--gl)' : '#FEF0F0', color: s.score >= (s.quizzes?.pass_score ?? 70) ? 'var(--gd)' : 'var(--red)' }}>
                {s.score}%
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.profiles?.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--mu)' }}>{s.quizzes?.title} · {fmtDate(s.submitted_at)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--mu)' }}>{s.score}/{s.total} câu đúng</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setReviewSub(s)}>Chi tiết</button>
            </div>
          ))}
          {submissions.length === 0 && (
            <div className="empty-state">
              <p>Chưa có kết quả</p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <QuizCreateModal
          quiz={editQuiz}
          profiles={profiles}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); show('Đã lưu bài kiểm tra'); load() }}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}

function QuizCreateModal({ quiz, profiles, onClose, onSaved }: {
  quiz: Quiz | null; profiles: Profile[]
  onClose: () => void; onSaved: () => void
}) {
  const { profile } = useAuth()
  const [title, setTitle] = useState(quiz?.title ?? '')
  const [desc, setDesc] = useState(quiz?.description ?? '')
  const [timeLimit, setTimeLimit] = useState(quiz?.time_limit ?? 30)
  const [passScore, setPassScore] = useState(quiz?.pass_score ?? 70)
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.quiz_questions ?? [{ question: '', options: ['', '', '', ''], correct_index: 0 }])
  const [assigned, setAssigned] = useState<string[]>(quiz?.quiz_assignments?.map(a => a.user_id) ?? [])
  const [saving, setSaving] = useState(false)

  function addQ() { setQuestions(q => [...q, { question: '', options: ['', '', '', ''], correct_index: 0 }]) }
  function removeQ(i: number) { setQuestions(q => q.filter((_, idx) => idx !== i)) }
  function updateQ(i: number, field: string, val: string | number | string[]) {
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const supabase = createClient()

    if (quiz) {
      await supabase.from('quizzes').update({ title, description: desc, time_limit: timeLimit, pass_score: passScore }).eq('id', quiz.id)
      await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id)
      await supabase.from('quiz_assignments').delete().eq('quiz_id', quiz.id)
      const qid = quiz.id
      if (questions.filter(q => q.question).length) {
        await supabase.from('quiz_questions').insert(questions.filter(q => q.question).map((q, i) => ({ ...q, quiz_id: qid, sort_order: i })))
      }
      if (assigned.length) {
        await supabase.from('quiz_assignments').insert(assigned.map(uid => ({ quiz_id: qid, user_id: uid })))
      }
    } else {
      const { data: newQuiz } = await supabase.from('quizzes').insert({ title, description: desc, time_limit: timeLimit, pass_score: passScore, created_by: profile?.id }).select().single()
      if (newQuiz) {
        if (questions.filter(q => q.question).length) {
          await supabase.from('quiz_questions').insert(questions.filter(q => q.question).map((q, i) => ({ ...q, quiz_id: newQuiz.id, sort_order: i })))
        }
        if (assigned.length) {
          await supabase.from('quiz_assignments').insert(assigned.map(uid => ({ quiz_id: newQuiz.id, user_id: uid })))
        }
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={quiz ? 'Sửa bài kiểm tra' : 'Tạo bài kiểm tra'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim()}>
            {saving ? 'Đang lưu...' : 'Lưu bài kiểm tra'}
          </button>
        </>
      }
    >
      {/* Tiêu đề và mô tả */}
      <div className="fg">
        <label>Tiêu đề bài kiểm tra *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nhập tiêu đề bài kiểm tra..." autoFocus />
      </div>
      <div className="fg">
        <label>Mô tả (tùy chọn)</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn về nội dung bài kiểm tra..." style={{ minHeight: 58, resize: 'none' }} />
      </div>

      {/* Điểm đầu / thời gian / làm lại */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.65rem', marginBottom: '.9rem' }}>
        <div className="fg" style={{ marginBottom: 0 }}><label>Điểm đầu (%)</label><input type="number" value={passScore} onChange={e => setPassScore(+e.target.value)} min={0} max={100} /></div>
        <div className="fg" style={{ marginBottom: 0 }}><label>Thời gian (phút)</label><input type="number" value={timeLimit} onChange={e => setTimeLimit(+e.target.value)} min={1} /></div>
        <div className="fg" style={{ marginBottom: 0 }}><label>Làm lại tối đa</label><input type="number" defaultValue={3} min={1} /></div>
      </div>

      {/* Tiêu chí chấm điểm */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '.75rem', marginBottom: '.9rem' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.6rem' }}>Tiêu chí chấm điểm</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.45rem', marginBottom: '.5rem' }}>
          {[
            { grade: 'A', label: 'Xuất sắc', range: '90% – 100%', cls: 'badge-green' },
            { grade: 'B', label: 'Giỏi', range: `${passScore}% – 89%`, cls: 'badge-blue' },
            { grade: 'C', label: 'Đạt', range: `${Math.max(passScore - 10, 0)}% – ${passScore - 1}%`, cls: 'badge-amber' },
            { grade: 'F', label: 'Không đạt', range: `0% – ${Math.max(passScore - 11, 0)}%`, cls: 'badge-red' },
          ].map(g => (
            <div key={g.grade} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8, padding: '.45rem .65rem' }}>
              <span className={`badge ${g.cls}`} style={{ fontSize: 12, fontWeight: 800, minWidth: 22, justifyContent: 'center' }}>{g.grade}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{g.label}</div>
                <div style={{ fontSize: 11, color: 'var(--mu)' }}>{g.range}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mu)' }}>* Xuất sắc ≥90% · Giỏi ≥điểm đạt · Đạt ≥điểm đạt-10% · Không đạt &lt; điểm đạt-10%</div>
      </div>

      {/* Phân công cho nhân viên */}
      {profiles.length > 0 && (
        <div style={{ marginBottom: '.9rem' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '.5rem' }}>Phân công cho nhân viên</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem' }}>
            {profiles.map(p => (
              <button key={p.id}
                onClick={() => setAssigned(a => a.includes(p.id) ? a.filter(x => x !== p.id) : [...a, p.id])}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', padding: '.3rem .75rem .3rem .45rem', borderRadius: 20, border: `1.5px solid ${assigned.includes(p.id) ? 'var(--green)' : 'var(--bd)'}`, fontSize: 12.5, cursor: 'pointer', background: assigned.includes(p.id) ? 'var(--gl)' : 'var(--sf)', color: assigned.includes(p.id) ? 'var(--gd)' : 'var(--tx)', fontWeight: assigned.includes(p.id) ? 600 : 400 }}
              >
                <div className="av-xs" style={{ background: p.avatar_color }}>{p.full_name.slice(0, 2).toUpperCase()}</div>
                {p.full_name}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: '.35rem' }}>Bỏ trống = tất cả nhân viên đều được làm</div>
        </div>
      )}

      {/* Câu hỏi */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Câu hỏi</div>
          <button className="btn btn-secondary btn-sm" onClick={addQ}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
            Thêm câu
          </button>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} style={{ background: 'var(--bg)', borderRadius: 10, padding: '.85rem', marginBottom: '.65rem', border: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Câu {qi + 1}</span>
              {questions.length > 1 && <button className="btn-icon danger" style={{ width: 24, height: 24 }} onClick={() => removeQ(qi)}>×</button>}
            </div>
            <div className="fg" style={{ marginBottom: '.45rem' }}>
              <textarea value={q.question} onChange={e => updateQ(qi, 'question', e.target.value)} placeholder="Nội dung câu hỏi..." style={{ minHeight: 60, resize: 'none' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '.35rem' }}>Ảnh minh họa (tùy chọn)</div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.45rem', border: '1.5px dashed var(--bd)', borderRadius: 8, padding: '.55rem', cursor: 'pointer', marginBottom: '.55rem', fontSize: 12, color: 'var(--mu)', background: 'var(--sf)' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} />
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 10l3.5-3.5 3 3 2-2 4 4"/></svg>
              Chọn ảnh
            </label>
            {['A', 'B', 'C', 'D'].map((letter, oi) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.38rem' }}>
                <input type="radio" name={`q${qi}`} checked={q.correct_index === oi} onChange={() => updateQ(qi, 'correct_index', oi)} style={{ accentColor: 'var(--green)', flexShrink: 0 }} />
                <input value={q.options[oi] ?? ''} onChange={e => {
                  const newOpts = [...q.options]
                  newOpts[oi] = e.target.value
                  updateQ(qi, 'options', newOpts)
                }} placeholder={`Đáp án ${letter}`}
                  style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: '.45rem .7rem', fontFamily: 'inherit', fontSize: 13, outline: 'none', flex: 1, background: q.correct_index === oi ? 'var(--gl)' : 'var(--sf)' }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}

function QuizTake({ quiz, profileId, onDone }: { quiz: Quiz; profileId: string; onDone: () => void }) {
  const [answers, setAnswers] = useState<number[]>(new Array(quiz.quiz_questions?.length ?? 0).fill(-1))
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit * 60)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(intervalRef.current!); submitQuiz(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [])

  async function submitQuiz() {
    if (submitted) return
    clearInterval(intervalRef.current!)
    const qs = quiz.quiz_questions ?? []
    const correct = answers.filter((a, i) => a === qs[i]?.correct_index).length
    const pct = Math.round((correct / qs.length) * 100)
    setScore(pct)
    setSubmitted(true)
    const supabase = createClient()
    await supabase.from('quiz_submissions').insert({ quiz_id: quiz.id, user_id: profileId, score: pct, total: qs.length, answers })
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')
  const qs = quiz.quiz_questions ?? []
  const passed = score >= quiz.pass_score

  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>Bài kiểm tra</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{quiz.title}</div>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          {!submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 8, padding: '.35rem .8rem' }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 2"/></svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: timeLeft < 60 ? 'var(--red)' : 'var(--tx)', minWidth: 42 }}>{mm}:{ss}</span>
            </div>
          )}
          {submitted
            ? <button className="btn btn-primary btn-sm" onClick={onDone}>Quay lại</button>
            : <button className="btn btn-ghost btn-sm" onClick={onDone}>Thoát</button>
          }
        </div>
      </div>

      <div style={{ padding: '1.25rem 2rem', maxWidth: 900 }}>
        {submitted && (
          <div style={{ background: passed ? 'var(--gl)' : '#FEF0F0', border: `1px solid ${passed ? 'var(--green)' : 'var(--red)'}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: passed ? 'var(--gd)' : 'var(--red)' }}>{score}%</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: passed ? 'var(--gd)' : 'var(--red)' }}>{passed ? '🎉 Đạt yêu cầu!' : '❌ Chưa đạt'}</div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginTop: '.35rem' }}>Cần {quiz.pass_score}% để đạt</div>
          </div>
        )}

        {qs.map((q, qi) => (
          <div key={qi} style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.95rem 1.1rem', marginBottom: '.65rem' }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: '.75rem' }}>
              <span style={{ color: 'var(--mu)', fontSize: 12, marginRight: '.5rem' }}>Câu {qi + 1}.</span>
              {q.question}
            </div>
            {q.options.map((opt, oi) => {
              const isSelected = answers[qi] === oi
              const isCorrect = submitted && oi === q.correct_index
              const isWrong = submitted && isSelected && oi !== q.correct_index
              return (
                <div key={oi} onClick={() => !submitted && setAnswers(a => { const n = [...a]; n[qi] = oi; return n })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.48rem .72rem', borderRadius: 8,
                    border: `1px solid ${isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : isSelected ? 'var(--green)' : 'var(--bd)'}`,
                    marginBottom: '.38rem', cursor: submitted ? 'default' : 'pointer', fontSize: 13.5,
                    background: isCorrect ? 'var(--gl)' : isWrong ? '#FEF0F0' : isSelected ? 'var(--gl)' : 'transparent'
                  }}
                >
                  <input type="radio" readOnly checked={isSelected} style={{ accentColor: 'var(--green)', flexShrink: 0 }} />
                  {opt}
                  {isCorrect && submitted && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--gd)' }}>✓ Đúng</span>}
                  {isWrong && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--red)' }}>✗</span>}
                </div>
              )
            })}
          </div>
        ))}

        {!submitted && (
          <button className="btn btn-primary" onClick={submitQuiz} style={{ marginTop: '.5rem' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>
            Nộp bài
          </button>
        )}
      </div>
    </div>
  )
}

function QuizReview({ sub, onBack }: { sub: QuizSubmission; onBack: () => void }) {
  return (
    <div>
      <div style={{ padding: '.95rem 1.2rem .7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)', background: 'var(--sf)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>{sub.profiles?.full_name} · {fmtDate(sub.submitted_at)}</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{sub.quizzes?.title}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Quay lại</button>
      </div>
      <div style={{ padding: '1.25rem 1.75rem' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: sub.score >= (sub.quizzes?.pass_score ?? 70) ? 'var(--green)' : 'var(--red)', marginBottom: '1rem' }}>
          {sub.score}% — {sub.score >= (sub.quizzes?.pass_score ?? 70) ? 'Đạt' : 'Chưa đạt'}
        </div>
        {(sub.quizzes?.quiz_questions ?? []).map((q, qi) => {
          const selected = (sub.answers as number[])[qi]
          const correct = q.correct_index
          return (
            <div key={qi} style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', padding: '.95rem 1.1rem', marginBottom: '.65rem' }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: '.75rem' }}>Câu {qi + 1}. {q.question}</div>
              {q.options.map((opt, oi) => {
                const isCorrect = oi === correct
                const isWrong = oi === selected && oi !== correct
                return (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.45rem .72rem', borderRadius: 8, border: `1px solid ${isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : 'var(--bd)'}`, marginBottom: '.38rem', fontSize: 13.5, background: isCorrect ? 'var(--gl)' : isWrong ? '#FEF0F0' : 'transparent' }}>
                    {opt}
                    {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--gd)' }}>✓</span>}
                    {isWrong && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--red)' }}>✗</span>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
