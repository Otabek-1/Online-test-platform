"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiSearch, FiEye, FiPrinter } from "react-icons/fi";
import { BiX } from "react-icons/bi";
import api from "./api";

export default function Results() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

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
        try {
          const qRes = await api.get(`/question/${questionId}`);
          if (qRes.success || qRes.data?.success) {
            questionText =
              qRes.data?.data?.question?.text ||
              qRes.data?.data?.text ||
              qRes.data?.question?.text ||
              "Nomalum savol";
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
      });
    } catch (err) {
      console.error("Details fetch error:", err);
      setErrorMessage("Batafsil ma'lumot yuklanmadi: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
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
          placeholder="Ism, email yoki telefon bo'yicha qidirish..."
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Natija
                  </th>
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
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {user.score_percent || user.percentage || "-"}%
                      </td>
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

      {/* DETAILS MODAL */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl print-area">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Test Natijasi
              </h2>

              <div className="flex items-center gap-3">
                {/* PRINT BUTTON */}
                <button
                  onClick={() => window.print()}
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
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-semibold text-slate-900">
                        {detailsData.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Telefon</p>
                      <p className="font-semibold text-slate-900">
                        {detailsData.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Telegram</p>
                      <p className="font-semibold text-slate-900">
                        {detailsData.telegram || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Natija</p>
                      <p className="text-2xl font-bold text-green-600">
                        {detailsData.percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {detailsData.description && (
                    <div className="pb-4 border-b border-slate-200">
                      <p className="text-sm text-slate-500 mb-2">Tavsif</p>
                      <p className="text-slate-900">{detailsData.description}</p>
                    </div>
                  )}

                  {/* Sections */}
                  {detailsData.sections && detailsData.sections.length > 0 && (
                    <div className="pb-4 border-b border-slate-200">
                      <p className="text-sm text-slate-500 mb-2">Bo'limlar</p>
                      <div className="flex flex-wrap gap-2">
                        {detailsData.sections.map((sec, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {sec.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Questions and Answers */}
                  {detailsData.answers && detailsData.answers.length > 0 ? (
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-4">
                        📝 Savollar va Javoblar
                      </h3>
                      <div className="space-y-4">
                        {detailsData.answers.map((item, idx) => (
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
                        ))}
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
    </div>
  );
}