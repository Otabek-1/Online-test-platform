import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FiEdit, FiTrash, FiEye, FiPlus, FiBook, FiBarChart2, FiLogOut } from "react-icons/fi";
import { BiX } from "react-icons/bi";
import api from "./api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import logo from "./assets/logo.png"

export default function Sections() {
  const { examId } = useParams();

  const [exam, setExam] = useState(null);
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const nav = useNavigate()
  function logOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    nav("/auth");
  }

  // Fetch exam details and related sections on mount
  useEffect(() => {
    fetchExamAndSections();
  }, [examId]);

  async function fetchExamAndSections() {
    setLoading(true);
    setError(null);
    try {
      // Fetch exam details
      const examRes = await api.get(`/exam/${examId}`);
      if (examRes.status === 200) {
        const examData = examRes.data?.data?.exam;
        setExam(examData);

        // Get exam's section_ids
        const sectionIds = examData?.section_ids || [];

        // Fetch all sections list
        const sectionsRes = await api.get("/section/list");
        if (sectionsRes.status === 200) {
          const allSectionsList = sectionsRes.data?.data?.sections || [];
          setAllSections(allSectionsList);

          // Filter sections that belong to this exam
          const examSections = allSectionsList.filter(s =>
            sectionIds.includes(s.id)
          );
          setSections(examSections);
        }
      } else {
        setError(examRes.error || "Examni olishda xatolik");
      }
    } catch (err) {
      setError(err.message || "Ma'lumot olishda tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setName("");
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Bo'lim nomini kiriting");
      return;
    }

    try {
      const res = await api.post("/section/create", {
        name: name.trim(),

      });

      if (res.status === 200) {
        setCreateOpen(false);
        setName("");
        await api.put(`/exam/update/${examId}`, { title: exam.title, description: exam.description, section_ids: exam.section_ids?.concat([res.data.data.id]) || [res.data.data.id] })
        await fetchExamAndSections();
      } else {
        setError(res.error || "Bo'lim yaratishda xatolik");
      }
    } catch (err) {
      setError(err.message || "Bo'lim yaratishda tarmoq xatosi");
    }
  }


  function openEdit(section) {
    setEditing(section);
    setName(section.name || "");
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editing || !name.trim()) {
      setError("Bo'lim nomini kiriting");
      return;
    }

    try {
      const res = await api.put(`/section/update/${editing.id}`, {
        name: name.trim(),
      });

      if (res.status === 200) {
        setEditOpen(false);
        setEditing(null);
        setName("");
        await fetchExamAndSections();
      } else {
        setError(res.error || "Bo'lim o'zgartirishda xatolik");
      }
    } catch (err) {
      setError(err.message || "Bo'lim o'zgartirishda tarmoq xatosi");
    }
  }

  async function handleDelete(sectionId) {
    if (!confirm("Bu bo'limni o'chirishni xohlaysizmi?")) return;

    try {
      const res = await api.delete(`/section/delete/${sectionId}`);

      if (res.status == 200) {
        await api.put(`/exam/update/${examId}`, { title: exam.title, description: exam.description, section_ids: exam.section_ids?.filter(id => id != sectionId) || [] })

        await fetchExamAndSections();
      } else {
        setError(res.error || "Bo'lim o'chirishda xatolik");
      }
    } catch (err) {
      setError(err.message || "Bo'lim o'chirishda tarmoq xatosi");
    }
  }

  return (
    <div className=" w-full flex h-screen">
      {/* Sidebar */}
      <div className="w-60 bg-gradient-to-t from-slate-900 via-slate-700 to-slate-600 text-white flex flex-col py-6 px-4 gap-4">
        <img src={logo} className="w-[60%]" alt="" style={{ alignSelf: "center" }} />

        <Button
          onClick={() => { nav("/dashboard"); localStorage.setItem("active", "exams") }}
          variant="ghost"
          className="justify-start text-white hover:bg-slate-700 text-lg cursor-pointer"
        >
          <FiBook className="mr-2" /> IMTIHONLAR
        </Button>

        <Button
          onClick={() => { nav("/dashboard"); localStorage.setItem("active", "results") }}
          variant="ghost"
          className="justify-start text-white hover:bg-slate-700 text-lg cursor-pointer"
        >
          <FiBarChart2 className="mr-2" /> NATIJALAR
        </Button>

        <div className="mt-auto">
          <Button
            variant="destructive"
            className="w-full justify-start text-white"
            onClick={logOut}
          >
            <FiLogOut className="mr-2" /> Chiqish
          </Button>
        </div>
      </div>
      <div className="flex flex-col w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">
            {exam?.title || "Imtihon"} bo'limlari
          </h1>

          <Button
            onClick={openCreate}
            title="Yangi bo'lim qo'shish"
            className="p-2"
          >
            <FiPlus />
          </Button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
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
          <div className="border rounded-lg bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Nomi</TableHead>
                  <TableHead className="text-right w-56">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="3" className="text-center py-6 text-gray-500">
                      Bu imtihonga bo'lim qo'shilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell>{section.id}</TableCell>
                      <TableCell className="font-medium">{section.name}</TableCell>

                      <TableCell className="text-right flex justify-end gap-2">
                        {/* Testlarni ko'rish - use Link to navigate */}
                        <Link to={`/tests/${section.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Testlarni ko'rish"
                            className="p-2"
                          >
                            Testlar +
                          </Button>
                        </Link>

                        {/* Edit */}
                        <Button
                          size="sm"
                          variant="outline"
                          title="Tahrirlash"
                          className="p-2"
                          onClick={() => openEdit(section)}
                        >
                          <FiEdit />
                        </Button>

                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="destructive"
                          title="O'chirish"
                          className="p-2"
                          onClick={() => handleDelete(section.id)}
                        >
                          <FiTrash />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Yangi bo'lim</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Bo'lim nomi"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Yaratish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && editing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Bo'limni tahrirlash</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Bo'lim nomi"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => nav(-1)} className="absolute bottom-10 right-10 bg-slate-800 text-white px-4 py-2 text-lg transition-all duration-300 hover:opacity-90 rounded-xl">Ortga</button>

    </div>
  );
}
