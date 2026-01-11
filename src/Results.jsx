"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiSearch, FiEye, FiPrinter } from "react-icons/fi";
import { BiX } from "react-icons/bi";
import api from "./api";

const printStyles = `
  @media print {
    body {
      margin: 0;
      padding: 0;
    }
    .print-modal-wrapper {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: white !important;
      z-index: 9999 !important;
      overflow: visible !important;
    }
    .print-modal-content {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 40px !important;
      page-break-inside: avoid !important;
    }
    .print-area {
      width: 100% !important;
      background: white !important;
    }
    .print-controls {
      display: none !important;
    }
    .fixed, .sticky {
      position: static !important;
    }
  }
`;

export default function Results() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [printModal, setPrintModal] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // 1) Userlarni yuklab olish
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await api.get("/user/list");
      if (res.success || res.data?.success) {
        const userList = res.data?.data?.users || res.data?.users || res.data || [];
        setUsers(userList);
      } else {
        setErrorMessage(res.error || "Userlarni olishda xatolik");
      }
    } catch (err) {
      console.error("Users fetch error:", err);
      setErrorMessage("Userlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // 2) User batafsilini yuklab olish
  const openDetails = async (user) => {
    setSelectedUser(user);
    setDetailsModal(true);
    setLoadingDetails(true);
    setDetailsData(null);
    setErrorMessage(null);
    setSelectedSection(null); // Reset selected section

    try {
      // User asosiy ma'lumotini olish
      const userRes = await api.get(`/user/${user.id}`);
      if (!userRes.success && !userRes.data?.success) {
        throw new Error("User ma'lumoti olishda xatolik");
      }

      const userData = userRes.data?.data?.user || userRes.data?.data || userRes.data;

      // JSON stringlari parse qilish
      let sections = [];
      let questions = [];
      let answers = [];

      try {
        sections = userData.bolimlar ? JSON.parse(userData.bolimlar) : [];
      } catch (e) {
        sections = [];
      }

      try {
        questions = userData.savollar ? JSON.parse(userData.savollar) : [];
      } catch (e) {
        questions = [];
      }

      try {
        answers = userData.javoblar ? JSON.parse(userData.javoblar) : [];
      } catch (e) {
        answers = [];
      }

      // Savollar va javoblarni batafsilini olish
      const qa = [];
      for (const answer of answers) {
        const questionId = answer.question_id;
        const optionIds = answer.option_ids || [];

        // Savol matnini olish
        let questionText = "Nomalum savol";
        let sectionId = answer.section_id; // Get section_id from answer
        
        try {
          const qRes = await api.get(`/question/${questionId}`);
          if (qRes.success || qRes.data?.success) {
            questionText =
              qRes.data?.data?.question?.text ||
              qRes.data?.data?.text ||
              qRes.data?.question?.text ||
              "Nomalum savol";
            
            // If section_id not in answer, try to get from question data
            if (!sectionId && qRes.data?.data?.question?.section_id) {
              sectionId = qRes.data?.data?.question?.section_id;
            }
          }
        } catch (err) {
          console.error("Question fetch error:", err);
        }

        // Tanlangan variantlarni olish
        const selectedOptions = [];
        for (const optId of optionIds) {
          try {
            const optRes = await api.get(`/option/${optId}`);
            if (optRes.success || optRes.data?.success) {
              const optData =
                optRes.data?.data?.option ||
                optRes.data?.data ||
                optRes.data?.option;

              selectedOptions.push({
                id: optId,
                text: optData?.text || "Nomalum variant",
                is_correct: optData?.is_correct || false,
              });
            }
          } catch (err) {
            console.error("Option fetch error:", err);
          }
        }

        qa.push({
          question_id: questionId,
          question: questionText,
          selectedOptions: selectedOptions,
          section_id: sectionId, // Add section_id to each answer
        });
      }

      // Natijani state ga joylashtirish
      setDetailsData({
        id: userData.id,
        name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim(),
        email: userData.email,
        phone: userData.phone,
        telegram: userData.tg_username || userData.telegram,
        percentage: userData.score_percent || 0,
        description: userData.description,
        sections: sections,
        questions: questions,
        answers: qa,
        sectionPercentages: calculateSectionPercentages(qa, sections),
        strongestSection: getStrongestSection(qa, sections),
        weakestSection: getWeakestSection(qa, sections),
        strongestDescription: "Ushbu yo'nalishda sizning bilimingiz juda qo'yi.",
        weakestDescription: "Ushbu yo'nalishda ko'proq ko'nikma va bilim kerak.",
        recommendation: `${getStrongestSection(qa, sections)} yo'nalishni tanlashingizni tavsiya etamiz. Bu sizning kuchli tomoningizdir.`,
      });
    } catch (err) {
      console.error("Details fetch error:", err);
      setErrorMessage("Batafsil ma'lumot yuklanmadi: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Helper function: Calculate section percentages
  const calculateSectionPercentages = (answers, sections) => {
    const percentages = {};
    
    if (!sections || sections.length === 0) return percentages;

    sections.forEach((section) => {
      const sectionAnswers = answers.filter((a) => a.section_id === section.id);
      if (sectionAnswers.length === 0) {
        percentages[section.name] = 0;
      } else {
        const correctCount = sectionAnswers.filter((a) =>
          a.selectedOptions.some((opt) => opt.is_correct)
        ).length;
        percentages[section.name] = Math.round(
          (correctCount / sectionAnswers.length) * 100
        );
      }
    });

    return percentages;
  };

  // Helper function: Get strongest section
  const getStrongestSection = (answers, sections) => {
    const percentages = calculateSectionPercentages(answers, sections);
    const strongest = Object.entries(percentages).sort((a, b) => b[1] - a[1])[0];
    return strongest ? strongest[0] : "Barcha yo'nalishlar";
  };

  // Helper function: Get weakest section
  const getWeakestSection = (answers, sections) => {
    const percentages = calculateSectionPercentages(answers, sections);
    const weakest = Object.entries(percentages).sort((a, b) => a[1] - b[1])[0];
    return weakest ? weakest[0] : "Barcha yo'nalishlar";
  };

  // 3) Filter
  const filtered = users.filter((u) => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const phone = u.phone || "";
    const q = search.toLowerCase();

    return (
      fullName.includes(q) || email.includes(q) || phone.includes(search)
    );
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <style>{printStyles}</style>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Natijalar</h1>
        <button
          onClick={() => fetchUsers()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Yangilash
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 w-96">
        <FiSearch className="text-gray-400 text-lg" />
        <Input
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>
            <BiX className="text-xl" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Yuklanmoqda...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 w-16">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    F.I.O
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Telefon
                  </th>
                  {/* <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Email
                  </th> */}
                  {/* <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Natija
                  </th> */}
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900 w-32">
                    Harakatlar
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Natija topilmadi
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.phone}
                      </td>
                      {/* <td className="px-6 py-4 text-sm text-slate-600">
                        {user.email}
                      </td> */}
                      {/* <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {user.score_percent || user.percentage || "-"}%
                      </td> */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openDetails(user)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                        >
                          <FiEye /> Batafsil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILS MODAL - Questions and Answers */}
      {detailsModal && !printModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Test Natijasi
              </h2>

              <div className="flex items-center gap-3">
                {/* PRINT BUTTON */}
                <button
                  onClick={() => setPrintModal(true)}
                  className="text-slate-600 hover:text-slate-900 text-xl"
                  title="Chop etish"
                >
                  <FiPrinter />
                </button>

                {/* CLOSE */}
                <button
                  onClick={() => setDetailsModal(false)}
                  className="text-slate-500 hover:text-slate-700 text-2xl"
                >
                  <BiX />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {loadingDetails ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Ma'lumotlar yuklanmoqda...</p>
                </div>
              ) : detailsData ? (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <p className="text-sm text-slate-500">F.I.O</p>
                      <p className="font-semibold text-slate-900">
                        {detailsData.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Telefon</p>
                      <p className="font-semibold text-slate-900">
                        {detailsData.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Natija</p>
                      <p className="text-2xl font-bold text-green-600">
                        {detailsData.percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Sections as Clickable Buttons */}
                  {detailsData.sections && detailsData.sections.length > 0 && (
                    <div className="pb-4 border-b border-slate-200">
                      <p className="text-sm text-slate-500 mb-3">Bo'limlar</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedSection(null)}
                          className={`px-4 py-2 rounded-lg font-medium transition ${
                            selectedSection === null
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          }`}
                        >
                          Barchasi
                        </button>
                        {detailsData.sections.map((sec, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedSection(selectedSection === sec.id ? null : sec.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                              selectedSection === sec.id
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {sec.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Questions and Answers - Filtered by Section */}
                  {detailsData.answers && detailsData.answers.length > 0 ? (
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-4">
                        📝 Savollar va Javoblar
                      </h3>
                      <div className="space-y-4">
                        {detailsData.answers.map((item, idx) => {
                          // If a section is selected, only show questions from that section
                          if (selectedSection !== null && item.section_id !== selectedSection) {
                            return null;
                          }
                          
                          return (
                            <div
                              key={idx}
                              className="bg-slate-50 p-4 rounded-lg border border-slate-200"
                            >
                              <p className="font-semibold text-slate-900 mb-3">
                                {idx + 1}. {item.question}
                              </p>

                              {item.selectedOptions.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">
                                  Javob berilmagan
                                </p>
                              ) : (
                                <div className="space-y-2 ml-4">
                                  {item.selectedOptions.map((opt) => (
                                    <div
                                      key={opt.id}
                                      className={`flex items-center gap-2 text-sm ${opt.is_correct
                                          ? "text-green-600 font-semibold"
                                          : "text-red-600"
                                        }`}
                                    >
                                      <span>
                                        {opt.is_correct ? "✅" : "❌"}
                                      </span>
                                      <span>{opt.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">
                      Hech qanday test topshirilmagan
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-red-500">Ma'lumot yuklanmadi</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6">
              <button
                onClick={() => setDetailsModal(false)}
                className="w-full px-4 py-2 bg-slate-300 text-slate-900 rounded-lg hover:bg-slate-400 transition font-semibold"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MODAL - Professional Report */}
      {printModal && detailsData && (
        <div className="print-modal-wrapper fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-transparent">
          <div className="print-modal-content bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-xl print:rounded-none print:shadow-none print:max-h-full print:overflow-visible">
            {/* PRINT FRIENDLY SECTION */}
            <div className="print-area">
              {/* REPORT HEADER */}
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-8 flex justify-between items-start print:bg-gray-700 print:p-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{detailsData.name}</h2>
                      <p className="text-gray-300 text-sm">Yo'nalish Test Natijasi</p>
                    </div>
                  </div>
                </div>
                <div className="text-right hidden print:block print:text-sm">
                  <p className="text-xs text-gray-300">PROFORIENTATSION TEST</p>
                </div>
              </div>

              {/* CONTENT CONTAINER */}
              <div className="p-8 print:p-6 bg-white">
                {/* SKILLS SECTION - Grid Layout */}
                {detailsData.sectionPercentages && Object.keys(detailsData.sectionPercentages).length > 0 ? (
                  <div className="mb-8 page-break-inside-avoid">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">YO'NALISH</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(detailsData.sectionPercentages)
                        .sort((a, b) => b[1] - a[1])
                        .map(([sectionName, percentage], idx) => (
                          <div key={idx} className="page-break-inside-avoid">
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-semibold text-slate-900 uppercase text-sm">{sectionName}</p>
                              <span className="text-sm font-bold text-slate-700">{percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {/* XARAKTER & SHAXSIYAT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 page-break-inside-avoid">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">✨</span>
                      <h5 className="font-semibold text-slate-900 text-sm">XARAKTER</h5>
                    </div>
                    <p className="text-xs text-slate-700">
                      Tafsilotlarga e'tibor beradi, sabr-toqatli, estetika va qulaylikka intiladi.
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎯</span>
                      <h5 className="font-semibold text-slate-900 text-sm">SHAXSIYAT</h5>
                    </div>
                    <p className="text-xs text-slate-700">
                      Ijodkor, vizual yo'naltirgan, chiroyli va qulay interfeyslarniga yaratadishan.
                    </p>
                  </div>
                </div>

                {/* MAIN SCORE AND RECOMMENDATION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 page-break-inside-avoid">
                  {/* OVERALL SCORE */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h4 className="text-sm text-slate-600 font-semibold mb-2">MANTIQ</h4>
                    <p className="text-4xl font-bold text-blue-600">{detailsData.percentage}%</p>
                    <p className="text-xs text-slate-500 mt-2">Umumiy natija</p>
                  </div>

                  {/* RECOMMENDATION */}
                  <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🎉</span>
                      <div>
                        <h4 className="text-sm text-slate-600 font-semibold mb-2">QOYIL!</h4>
                        <p className="text-sm text-slate-700">
                          {detailsData.recommendation || 
                            "Farzandingizga eng baland natija olgan yo'nalishni tanlashi tavsiya etiladi."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION / XULOSA */}
                {detailsData.answers && (
                  <div className="mb-8 pb-8 border-b border-gray-200 page-break-inside-avoid">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4 uppercase">XULOSA</h4>
                    <div className="space-y-2 text-lg font-semibold text-slate-800">
                      <p>User test yakuntladi.</p>
                      <p>To'g'ri: <span className="text-green-600">{detailsData.answers.filter(a => a.selectedOptions.some(opt => opt.is_correct)).length}</span>, Noto'g'ri: <span className="text-red-600">{detailsData.answers.filter(a => !a.selectedOptions.some(opt => opt.is_correct) && a.selectedOptions.length > 0).length}</span>, Ball: <span className="text-blue-600">{detailsData.percentage}</span></p>
                    </div>
                  </div>
                )}

                {/* STRENGTHS AND WEAKNESSES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 page-break-inside-avoid">
                  {/* KUCHLI TOMONI */}
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-2xl">💪</span>
                      <h4 className="text-sm font-semibold text-slate-900 uppercase mt-1">KUCHLI TOMONI</h4>
                    </div>
                    {detailsData.strongestSection && (
                      <div>
                        <p className="text-sm text-slate-600 mb-2">Eng baland natija:</p>
                        <p className="text-lg font-bold text-green-700 mb-2">{detailsData.strongestSection}</p>
                        <p className="text-xs text-slate-600">
                          {detailsData.strongestDescription || "Ushbu yo'nalishda sizning bilimingiz juda qo'yi."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ZAIF TOMONI / KAMCHILIKLARI */}
                  <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-2xl">⚡</span>
                      <h4 className="text-sm font-semibold text-slate-900 uppercase mt-1">KAMCHILIKLARI</h4>
                    </div>
                    {detailsData.weakestSection && (
                      <div>
                        <p className="text-sm text-slate-600 mb-2">Rivojlanish kerak:</p>
                        <p className="text-lg font-bold text-orange-700 mb-2">{detailsData.weakestSection}</p>
                        <p className="text-xs text-slate-600">
                          {detailsData.weakestDescription || "Ushbu yo'nalishda ko'proq ko'nikma va bilim kerak."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* FOOTER */}
                <div className="mt-12 pt-8 border-t border-gray-300 text-center text-xs text-gray-600 page-break-inside-avoid">
                  <div className="space-y-1">
                    <p className="font-semibold">📞 Telefon: <span className="font-normal">+99870 012 50 51</span></p>
                    <p><span className="font-semibold">📱 Instagram:</span> <span className="font-normal">@itliveacademy</span></p>
                    <p><span className="font-semibold">💬 Telegram:</span> <span className="font-normal">@ITLIVE_ACADEMY</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROLS - Not printable */}
            <div className="print-controls sticky bottom-0 bg-white border-t border-slate-200 p-6 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <FiPrinter /> Chop etish
              </button>
              <button
                onClick={() => setPrintModal(false)}
                className="flex-1 px-4 py-2 bg-slate-300 text-slate-900 rounded-lg hover:bg-slate-400 transition font-semibold"
              >
                Orqaga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}