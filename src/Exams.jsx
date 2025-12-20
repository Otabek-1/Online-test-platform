import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FiEdit, FiTrash, FiEye, FiPlus } from "react-icons/fi";
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
import { Link } from "react-router-dom";

export default function Exams() {
    const [exams, setExams] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedSections, setSelectedSections] = useState([]);

    // Fetch exams on mount
    useEffect(() => {
        fetchExams();
        fetchSections();
    }, []);

    async function fetchExams() {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/exam/list");
            if (res.status === 200) {
                const examsList = res.data?.data?.exams || [];
                setExams(examsList);
            } else {
                setError(res.error || "Examlarni olishda xatolik");
            }
        } catch (err) {
            setError(err.message || "Examlarni olishda tarmoq xatosi");
        } finally {
            setLoading(false);
        }
    }

    async function fetchSections() {
        try {
            const res = await api.get("/section/list");
            if (res.status === 200) {
                const sectionsList = res.data?.data?.sections || [];
                setSections(sectionsList);
            }
        } catch (err) {
            console.error("Sectionlarni olishda xatolik:", err);
        }
    }

    function openCreate() {
        setTitle("");
        setDescription("");
        setSelectedSections([]);
        setCreateModalOpen(true);
    }

    async function handleCreate() {
        if (!title.trim() || selectedSections.length === 0) {
            setError("Sarlavha va kamida bitta bo'lim tanlang");
            return;
        }

        try {
            const res = await api.post("/exam/create", {
                title: title.trim(),
                description: description.trim(),
                section_ids: selectedSections,
            });

            if (res.status === 200) {
                setCreateModalOpen(false);
                setTitle("");
                setDescription("");
                setSelectedSections([]);
                await fetchExams();
            } else {
                setError(res.error || "Exam yaratishda xatolik");
            }
        } catch (err) {
            setError(err.message || "Exam yaratishda tarmoq xatosi");
        }
    }

    function openEdit(exam) {
        setEditingExam(exam);
        setTitle(exam.title || "");
        setDescription(exam.description || "");
        setSelectedSections(exam.section_ids || []);
        setEditModalOpen(true);
    }

    async function handleEdit() {
        if (!editingExam || !title.trim() || selectedSections.length === 0) {
            setError("Sarlavha va kamida bitta bo'lim tanlang");
            return;
        }

        try {
            const res = await api.put(`/exam/update/${editingExam.id}`, {
                title: title.trim(),
                description: description.trim(),
                section_ids: selectedSections,
            });

            if (res.status === 200) {
                setEditModalOpen(false);
                setEditingExam(null);
                setTitle("");
                setDescription("");
                setSelectedSections([]);
                await fetchExams();
            } else {
                setError(res.error || "Exam o'zgartirishda xatolik");
            }
        } catch (err) {
            setError(err.message || "Exam o'zgartirishda tarmoq xatosi");
        }
    }

    async function handleDelete(id) {
        if (!confirm("Haqiqatan ham bu examni o'chirmoqchimisiz?")) return;

        const exam = exams.find(exam => exam.id == id);
        if (!exam) return;

        // 1) Hozir mavjud bo'lgan section ID larni olish
        const existingSectionIds = sections.map(s => s.id);

        // 2) Examdagi section_ids ichidan haqiqatan mavjudlarini ajratamiz
        const activeSectionIds = (exam.section_ids || []).filter(
            secId => existingSectionIds.includes(secId)
        );

        // 3) Agar hali real bo'limlar biriktirilgan bo'lsa — o'chirish taqiqlanadi
        if (activeSectionIds.length > 0) {
            alert(`O'chirish imkonsiz! ${activeSectionIds.length} ta mavjud bo'lim biriktirilgan.`);
            return;
        }

        // 4) O'chirishga ruxsat
        try {
            const res = await api.delete(`/exam/delete/${id}`);

            if (res.status === 200) {
                await fetchExams();
            } else {
                setError(res.error || "Exam o'chirishda xatolik");
            }
        } catch (err) {
            setError(err.message || "Exam o'chirishda tarmoq xatosi");
        }
    }


    function toggleSection(sectionId) {
        setSelectedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    }

    function slugify(text) {
        return text
            .toLowerCase()                // kichik harflarga o'tkazish
            .trim()                       // bo'sh joylarni olib tashlash
            .replace(/[\s\_]+/g, "-")     // bo‘sh joy va _ ni - ga almashtirish
            .replace(/[^a-z0-9\-]/g, ""); // noodatiy belgilarni olib tashlash
    }

    async function createExamLink(examId) {
        try {
            const exam = exams.find(e => e.id === examId);
            const res = await api.post("/test/generate", {
                name: slugify(exam.title),
                section_ids: exam.section_ids
            });
            if (res.status === 200) {
                const link = res.data.data.link;
                await navigator.clipboard.writeText(link);
                alert("Link clipboardga copi qilindi:\n" + link);
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Link olishda xatolik!");
        }
    }


    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Imtihonlar</h1>

                <div className="flex items-center gap-2">
                    <Button onClick={openCreate} title="Yangi imtihon yaratish" className="p-2">
                        <FiPlus />
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
                    <span>{error}</span>
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
                <div className="border rounded-lg bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">ID</TableHead>
                                <TableHead>Nomi</TableHead>
                                <TableHead>Tavsifi</TableHead>
                                <TableHead>Bo'limlar</TableHead>
                                <TableHead className="text-right w-60">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {exams.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan="5" className="text-center py-6 text-gray-500">
                                        Examlar topilmadi
                                    </TableCell>
                                </TableRow>
                            ) : (
                                exams.map((exam) => (
                                    <TableRow key={exam.id}>
                                        <TableCell>{exam.id}</TableCell>
                                        <TableCell className="font-medium">{exam.title}</TableCell>
                                        <TableCell className="max-w-xs text-sm text-gray-600">
                                            {exam.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {exam.section_ids?.length || 0} ta
                                        </TableCell>

                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                title="Tahrirlash"
                                                onClick={() => openEdit(exam)}
                                                className="p-2"
                                            >
                                                <FiEdit />
                                            </Button>

                                            <Link to={`/sections/${exam.id}`}>
                                                <Button size="sm" variant="outline" title="Bo'limlarni ko'rish" className="p-2">
                                                    <FiEye />
                                                </Button>
                                            </Link>

                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                title="O'chirish"
                                                onClick={() => handleDelete(exam.id)}
                                                className="p-2"
                                            >
                                                <FiTrash />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                title="Copy link"
                                                onClick={() => createExamLink(exam.id)}
                                                className="p-2"
                                            >
                                                Link olish
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Yangi imtihon yaratish</h3>

                        {/* Title */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Sarlavha</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Imtihon sarlavhasi"
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Tavsifi</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                rows="3"
                                placeholder="Imtihon tavsifi"
                            />
                        </div>

                        {/* Sections Multi-Select */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Bo'limlarni tanlang</label>
                            <div className="border rounded p-3 max-h-48 overflow-y-auto">
                                {sections.length === 0 ? (
                                    <p className="text-sm text-gray-500">Bo'limlar topilmadi</p>
                                ) : (
                                    sections.map(section => (
                                        <div key={section.id} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                id={`section-${section.id}`}
                                                checked={selectedSections.includes(section.id)}
                                                onChange={() => toggleSection(section.id)}
                                                className="rounded"
                                            />
                                            <label htmlFor={`section-${section.id}`} className="text-sm cursor-pointer">
                                                {section.name}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">
                                Bekor qilish
                            </button>
                            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded">
                                Yaratish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModalOpen && editingExam && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Imtihonni tahrirlash</h3>

                        {/* Title */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Sarlavha</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Imtihon sarlavhasi"
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Tavsifi</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                rows="3"
                                placeholder="Imtihon tavsifi"
                            />
                        </div>

                        {/* Sections Multi-Select */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Bo'limlarni tanlang</label>
                            <div className="border rounded p-3 max-h-48 overflow-y-auto">
                                {sections.length === 0 ? (
                                    <p className="text-sm text-gray-500">Bo'limlar topilmadi</p>
                                ) : (
                                    sections.map(section => (
                                        <div key={section.id} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                id={`edit-section-${section.id}`}
                                                checked={selectedSections.includes(section.id)}
                                                onChange={() => toggleSection(section.id)}
                                                className="rounded"
                                            />
                                            <label htmlFor={`edit-section-${section.id}`} className="text-sm cursor-pointer">
                                                {section.name}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">
                                Bekor qilish
                            </button>
                            <button onClick={handleEdit} className="px-4 py-2 bg-blue-600 text-white rounded">
                                Saqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
