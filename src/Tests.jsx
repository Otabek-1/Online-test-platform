import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FiEdit, FiTrash, FiPlus } from "react-icons/fi";
import { BiX } from "react-icons/bi";
import { TiTick } from "react-icons/ti";
import api from "./api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Tests() {
  const { sectionId } = useParams();

  const [section, setSection] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);
  
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [optionInputs, setOptionInputs] = useState({ A: "", B: "", C: "", D: "" });
  const [correctAnswer, setCorrectAnswer] = useState("A");

  const nav = useNavigate();

  // Fetch section, questions, and options on mount
  useEffect(() => {
    fetchSectionData();
  }, [sectionId]);

  async function fetchSectionData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch questions for this section
      const qRes = await api.get("/question/list");
      if (qRes.status === 200 || (qRes.data && qRes.data.success)) {
        const allQuestions = qRes.data?.data?.questions || [];
        const sectionQuestions = allQuestions.filter(q => q.section_id == sectionId);
        setQuestions(sectionQuestions);
        // console.log(`Section ${sectionId} uchun ${sectionQuestions.length} ta savol topildi`);
        setSection({ id: sectionId, name: `Bo'lim #${sectionId}` });
      } else {
        setError(qRes.error || "Savollarni olishda xatolik");
      }

      // Fetch all options
      const oRes = await api.get("/option/list");
      if (oRes.status === 200 || (oRes.data && oRes.data.success)) {
        const allOptions = oRes.data?.data?.options || [];
        // console.log(`Jami ${allOptions.length} ta option topildi:`, allOptions);
        // console.log("Option question_ids:", allOptions.map(o => o.question_id));
        setOptions(allOptions);
      }
    } catch (err) {
      setError(err.message || "Ma'lumot olishda tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  function getOptionsForQuestion(questionId) {
    const qOpts = options.filter(o => o.question_id == questionId);
    // console.log(`Question ${questionId} uchun ${qOpts.length} ta option:`, qOpts);
    return qOpts;
  }

  // Validation function
  function validateForm() {
    const errors = {};

    if (!questionText.trim()) {
      errors.question = "Savol matni bo'sh bo'lishi mumkin emas";
    }

    if (questionText.trim().length < 5) {
      errors.question = "Savol matni kamida 5 ta belgidan iborat bo'lishi kerak";
    }

    ["A", "B", "C", "D"].forEach(letter => {
      if (!optionInputs[letter].trim()) {
        errors[letter] = `${letter} variantini kiriting`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function openCreate() {
    setQuestionText("");
    setOptionInputs({ A: "", B: "", C: "", D: "" });
    setCorrectAnswer("A");
    setValidationErrors({});
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!validateForm()) {
      setError("Iltimos, barcha xatolarni to'g'rilang");
      return;
    }

    try {
      // Create question
      const qRes = await api.post("/question/create", {
        section_id: parseInt(sectionId),
        text: questionText.trim(),
      });

      if (qRes.status === 200 || (qRes.data && qRes.data.success)) {
        // Try to get question ID from response
        let questionId = qRes.data?.data?.question?.id || qRes.data?.question?.id;
        // console.log("Question create response:", qRes.data);
        // console.log("QuestionId from response:", questionId);

        // If no ID in response, fetch questions and find the newly created one
        if (!questionId) {
          const freshQRes = await api.get("/question/list");
          if (freshQRes.status === 200 || (freshQRes.data && freshQRes.data.success)) {
            const allQuestions = freshQRes.data?.data?.questions || [];
            const newQ = allQuestions.find(q => q.text === questionText.trim());
            if (newQ) {
              questionId = newQ.id;
              // console.log("Found new question by text match:", questionId);
            }
          }
        }

        if (!questionId) {
          setError("Savol yaratildi lekin ID topilmadi. Sahifani yangilang");
          await fetchSectionData();
          return;
        }
        
        // console.log("Will create options for questionId:", questionId);

        // Create options for this question
        const letters = ["A", "B", "C", "D"];
        let optionsCreated = 0;
        for (const letter of letters) {
          try {
            const oRes = await api.post("/option/create", {
              question_id: questionId,
              text: optionInputs[letter].trim(),
              is_correct: correctAnswer === letter,
            });
            // console.log(`Option ${letter} response:`, oRes);
            if (oRes.status === 200 || (oRes.data && oRes.data.success)) {
              optionsCreated++;
            } else {
              console.warn(`Option ${letter} response not success:`, oRes);
            }
          } catch (optErr) {
            console.error(`Option ${letter} yaratishda xatolik:`, optErr);
          }
        }

        // console.log(`${optionsCreated} ta option yaratildi`);

        if (optionsCreated === 0) {
          setError("Savollar yaratildi lekin optsiyalar yaratilmadi");
        }

        setCreateOpen(false);
        setQuestionText("");
        setOptionInputs({ A: "", B: "", C: "", D: "" });
        setValidationErrors({});
        await fetchSectionData();
      } else {
        setError(qRes.error || "Savol yaratishda xatolik");
      }
    } catch (err) {
      setError(err.message || "Savol yaratishda tarmoq xatosi");
    }
  }

  function openEdit(question) {
    setEditingQuestion(question);
    setQuestionText(question.text);

    // Get options for this question - sorted by ID to ensure consistency
    const qOptions = getOptionsForQuestion(question.id).sort((a, b) => a.id - b.id);
    
    if (qOptions.length === 0) {
      // No options found for this question
      setOptionInputs({ A: "", B: "", C: "", D: "" });
      setCorrectAnswer("A");
    } else {
      const optMap = {};
      let correctLetter = "A";

      // Map sorted options to A, B, C, D based on their order
      ["A", "B", "C", "D"].forEach((letter, index) => {
        if (qOptions[index]) {
          optMap[letter] = qOptions[index].text || "";
          if (qOptions[index].is_correct) {
            correctLetter = letter;
          }
        } else {
          optMap[letter] = "";
        }
      });

      setOptionInputs(optMap);
      setCorrectAnswer(correctLetter);
    }
    
    setValidationErrors({});
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!validateForm()) {
      setError("Iltimos, barcha xatolarni to'g'rilang");
      return;
    }

    if (!editingQuestion) return;

    try {
      // Update question
      const qRes = await api.put(`/question/update/${editingQuestion.id}`, {
        section_id: parseInt(sectionId),
        text: questionText.trim(),
      });

      if (qRes.status === 200 || (qRes.data && qRes.data.data.success)) {
        // Update or create options
        const qOptions = getOptionsForQuestion(editingQuestion.id).sort((a, b) => a.id - b.id);
        const letters = ["A", "B", "C", "D"];

        for (let i = 0; i < letters.length; i++) {
          const letter = letters[i];
          const optionId = qOptions[i]?.id;
          
          if (optionId) {
            // Update existing option
            try {
              await api.put(`/option/update/${optionId}`, {
                question_id: editingQuestion.id,
                text: optionInputs[letter].trim(),
                is_correct: correctAnswer === letter,
              });
            } catch (err) {
              console.error(`Option ${letter} update xatosi:`, err);
            }
          } else {
            // Create new option if it doesn't exist
            try {
              await api.post("/option/create", {
                question_id: editingQuestion.id,
                text: optionInputs[letter].trim(),
                is_correct: correctAnswer === letter,
              });
            } catch (err) {
              console.error(`Option ${letter} create xatosi:`, err);
            }
          }
        }

        setEditOpen(false);
        setEditingQuestion(null);
        setQuestionText("");
        setOptionInputs({ A: "", B: "", C: "", D: "" });
        setValidationErrors({});
        await fetchSectionData();
      } else {
        setError(qRes.error || "Savol o'zgartirishda xatolik");
      }
    } catch (err) {
      setError(err.message || "Savol o'zgartirishda tarmoq xatosi");
    }
  }

  function openDeleteModal(questionId) {
    setDeleteQuestionId(questionId);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteQuestionId) return;

    try {
      // Delete all options for this question first
      const qOptions = getOptionsForQuestion(deleteQuestionId);
      for (const opt of qOptions) {
        await api.delete(`/option/delete/${opt.id}`);
      }

      // Then delete the question
      const res = await api.delete(`/question/delete/${deleteQuestionId}`);
      if (res.status === 200 || (res.data && res.data.success)) {
        setDeleteOpen(false);
        setDeleteQuestionId(null);
        await fetchSectionData();
      } else {
        setError(res.error || "Savol o'chirishda xatolik");
      }
    } catch (err) {
      setError(err.message || "Savol o'chirishda tarmoq xatosi");
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Bo'limlar</h2>
        <nav className="space-y-2">
          <a onClick={()=>nav(-1)} className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-700 cursor-pointer">
            Barcha bo'limlar
          </a>
          <a href={`/section/${sectionId}`} className="block px-4 py-2 rounded bg-blue-50 text-blue-600 font-medium">
            {section?.name || `Bo'lim #${sectionId}`}
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-white border-b shadow-sm">
          <div className="max-w-full mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">{section?.name || "Testlar"} savollari</h1>
            <Button onClick={openCreate} title="Yangi savol qo'shish" className="p-2">
              <FiPlus />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                <BiX />
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-6">
              <p className="text-gray-500">Yuklanmoqda...</p>
            </div>
          )}

          {/* Table */}
          {!loading && (
            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-16 text-xs">ID</TableHead>
                    <TableHead className="text-xs">Savol matni</TableHead>
                    <TableHead className="w-20 text-center text-xs">A</TableHead>
                    <TableHead className="w-20 text-center text-xs">B</TableHead>
                    <TableHead className="w-20 text-center text-xs">C</TableHead>
                    <TableHead className="w-20 text-center text-xs">D</TableHead>
                    <TableHead className="text-right w-24 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="7" className="text-center py-4 text-gray-500 text-sm">
                        Savollar topilmadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    questions.map((q) => {
                      const qOptions = getOptionsForQuestion(q.id);
                      return (
                        <TableRow key={q.id} className="hover:bg-gray-50">
                          <TableCell className="text-xs text-gray-600">{q.id}</TableCell>
                          <TableCell className="max-w-xs text-xs text-gray-800 truncate">{q.text}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs text-gray-600">{qOptions[0]?.text?.slice(0, 8) || "-"}</span>
                              {qOptions[0]?.is_correct && (
                                <TiTick className="text-green-600 text-sm" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs text-gray-600">{qOptions[1]?.text?.slice(0, 8) || "-"}</span>
                              {qOptions[1]?.is_correct && (
                                <TiTick className="text-green-600 text-sm" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs text-gray-600">{qOptions[2]?.text?.slice(0, 8) || "-"}</span>
                              {qOptions[2]?.is_correct && (
                                <TiTick className="text-green-600 text-sm" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs text-gray-600">{qOptions[3]?.text?.slice(0, 8) || "-"}</span>
                              {qOptions[3]?.is_correct && (
                                <TiTick className="text-green-600 text-sm" />
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Tahrirlash"
                              className="p-1 h-8 w-8"
                              onClick={() => openEdit(q)}
                            >
                              <FiEdit size={16} />
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              title="O'chirish"
                              className="p-1 h-8 w-8"
                              onClick={() => openDeleteModal(q.id)}
                            >
                              <FiTrash size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-semibold mb-4">Yangi savol qo'shish</h3>

            {/* Question text */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 text-gray-700">Savol matni</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  validationErrors.question ? "border-red-500" : "border-gray-300"
                }`}
                rows="2"
                placeholder="Savol kiriting"
              />
              {validationErrors.question && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.question}</p>
              )}
            </div>

            {/* Options */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2 text-gray-700">Javob variantlari</label>
              {["A", "B", "C", "D"].map((letter) => (
                <div key={letter} className="mb-2 flex items-start gap-2">
                  <label className="flex items-center gap-1 pt-1.5 flex-shrink-0">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctAnswer === letter}
                      onChange={() => setCorrectAnswer(letter)}
                      className="w-3 h-3"
                    />
                    <span className="font-semibold text-xs text-gray-700">{letter}</span>
                  </label>
                  <div className="flex-1">
                    <input
                      value={optionInputs[letter]}
                      onChange={(e) =>
                        setOptionInputs((prev) => ({ ...prev, [letter]: e.target.value }))
                      }
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        validationErrors[letter] ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder={`${letter} variant`}
                    />
                    {validationErrors[letter] && (
                      <p className="text-red-500 text-xs mt-0.5">{validationErrors[letter]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Yaratish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-semibold mb-4">Savolni tahrirlash</h3>

            {/* Question text */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 text-gray-700">Savol matni</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  validationErrors.question ? "border-red-500" : "border-gray-300"
                }`}
                rows="2"
                placeholder="Savol kiriting"
              />
              {validationErrors.question && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.question}</p>
              )}
            </div>

            {/* Options */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2 text-gray-700">Javob variantlari</label>
              {["A", "B", "C", "D"].map((letter) => (
                <div key={letter} className="mb-2 flex items-start gap-2">
                  <label className="flex items-center gap-1 pt-1.5 flex-shrink-0">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctAnswer === letter}
                      onChange={() => setCorrectAnswer(letter)}
                      className="w-3 h-3"
                    />
                    <span className="font-semibold text-xs text-gray-700">{letter}</span>
                  </label>
                  <div className="flex-1">
                    <input
                      value={optionInputs[letter]}
                      onChange={(e) =>
                        setOptionInputs((prev) => ({ ...prev, [letter]: e.target.value }))
                      }
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        validationErrors[letter] ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder={`${letter} variant`}
                    />
                    {validationErrors[letter] && (
                      <p className="text-red-500 text-xs mt-0.5">{validationErrors[letter]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditOpen(false)}
                className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <FiTrash className="text-red-600 text-xl" />
            </div>
            
            <h3 className="text-center text-lg font-semibold text-gray-900 mb-2">
              Savol o'chirilsinmi?
            </h3>
            
            <p className="text-center text-sm text-gray-600 mb-6">
              Bu savol va uning barcha variantlari o'chiriladi. Ushbu amalni qaytarib bo'lmaydi.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteQuestionId(null);
                }}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition font-medium"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={()=>nav(-1)} className="absolute bottom-10 right-10 bg-slate-800 text-white px-4 py-2 text-lg transition-all duration-300 hover:opacity-90 rounded-xl">Ortga</button>
    </div>
  );
}