"""Yordamchi funksiyalar testlari."""

from __future__ import annotations

from utils.text import TELEGRAM_MAX_LENGTH, split_text, strip_html


def test_qisqa_matn_bolinmaydi():
    assert split_text("qisqa javob") == ["qisqa javob"]


def test_uzun_matn_limitga_sigadi():
    chunks = split_text("qator\n" * 2000)
    assert len(chunks) > 1
    assert all(len(c) <= TELEGRAM_MAX_LENGTH for c in chunks)


def test_bolish_qator_chegarasida():
    """Imkon bo'lsa matn so'z o'rtasidan emas, qator oxiridan bo'linadi."""
    text = ("a" * 100 + "\n") * 60  # ~6060 belgi
    chunks = split_text(text)
    assert len(chunks) == 2
    assert not chunks[0].endswith("a" * 100 + "a")  # o'rtasidan kesilmagan


def test_probel_yoq_matn_ham_bolinadi():
    """Bo'sh joy umuman bo'lmasa, qattiq kesish ishlashi kerak."""
    chunks = split_text("x" * 10_000)
    assert len(chunks) == 3
    assert all(len(c) <= TELEGRAM_MAX_LENGTH for c in chunks)
    assert "".join(chunks) == "x" * 10_000


def test_strip_html_teglarni_olib_tashlaydi():
    assert strip_html("<b>Narx</b> — 100$ dan <i>boshlanadi</i>") == "Narx — 100$ dan boshlanadi"


def test_strip_html_teg_yoq_matnga_tegmaydi():
    assert strip_html("oddiy matn") == "oddiy matn"
