import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FiEdit, FiTrash, FiPlus } from "react-icons/fi";
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

export default function SectionList() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState(null);

    const [name, setName] = useState("");

    useEffect(() => {
        fetchSections();
    }, []);

    async function fetchSections() {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/section/list");
            if (res.status === 200) {
                const list = res.data?.data?.sections || [];
                setSections(list);
            } else {
                setError(res.error || "Sectionlarni olishda xatolik");
            }
        } catch (err) {
            setError(err.message || "Sectionlarni olishda tarmoq xatosi");
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setName("");
        setCreateModalOpen(true);
    }

    async function handleCreate() {
        if (!name.trim()) {
            setError("Section nomi bo'sh bo'lishi mumkin emas");
            return;
        }

        try {
            const res = await api.post("/section/create", { name: name.trim() });
            if (res.status === 200) {
                setCreateModalOpen(false);
                setName("");
                await fetchSections();
            } else {
                setError(res.error || "Section yaratishda xatolik");
            }
        } catch (err) {
            setError(err.message || "Section yaratishda tarmoq xatosi");
        }
    }

    function openEdit(section) {
        setEditingSection(section);
        setName(section.name || "");
        setEditModalOpen(true);
    }

    async function handleEdit() {
        if (!editingSection || !name.trim()) {
            setError("Section nomi bo'sh bo'lishi mumkin emas");
            return;
        }

        try {
            const res = await api.put(`/section/update/${editingSection.id}`, {
                name: name.trim(),
            });

            if (res.status === 200) {
                setEditModalOpen(false);
                setEditingSection(null);
                setName("");
                await fetchSections();
            } else {
                setError(res.error || "Section yangilashda xatolik");
            }
        } catch (err) {
            setError(err.message || "Section yangilashda tarmoq xatosi");
        }
    }

    async function handleDelete(id) {
        if (!confirm("Haqiqatan ham bu sectionni o'chirmoqchimisiz?")) return;

        try {
            const res = await api.delete(`/section/delete/${id}`);
            if (res.status === 200) {
                await fetchSections();
            } else {
                setError(res.error || "Section o'chirishda xatolik");
            }
        } catch (err) {
            setError(err.message || "Section o'chirishda tarmoq xatosi");
        }
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Bo'limlar</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={openCreate} title="Yangi bo'lim yaratish" className="p-2">
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
                                <TableHead className="text-right w-60">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sections.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan="3" className="text-center py-6 text-gray-500">
                                        Sectionlar topilmadi
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sections.map((section) => (
                                    <TableRow key={section.id}>
                                        <TableCell>{section.id}</TableCell>
                                        <TableCell className="font-medium">{section.name}</TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Link to={`/tests/${section.id}`}>
                                                <Button size="sm" variant="outline" title="Testlarni ko'rish" className="p-2">
                                                    Tests
                                                </Button>
                                            </Link>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                title="Tahrirlash"
                                                onClick={() => openEdit(section)}
                                                className="p-2"
                                            >
                                                <FiEdit />
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                title="O'chirish"
                                                onClick={() => handleDelete(section.id)}
                                                className="p-2"
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

            {/* Create Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Yangi bo'lim yaratish</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Nomi</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Bo'lim nomi"
                            />
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
            {editModalOpen && editingSection && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Sectionni tahrirlash</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Nomi</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Bo'lim nomi"
                            />
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
