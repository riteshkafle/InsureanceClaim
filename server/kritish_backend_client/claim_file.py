"""Claim form PDF filler.

Purpose:
- Define coordinate/config mappings for insurance claim and Schedule A medical deduction PDFs.
- Transform backend JSON artifacts (output/claim_form.json, output/schedule_a_medical.json) into field values.
- Render values onto specific pages of template PDFs (united.pdf, form_1040_irs.pdf) using overlay merging.

Core components:
- Dataclasses (TextFieldConfig, BoxFieldConfig, CheckBoxFieldConfig, TemplateConfig) describe how each field is placed.
- Mapping helpers normalize dates, phone numbers, currency, tax IDs, and checkbox states.
- map_backend_to_claim_data: Converts claim_form.json structure to flattened drawing-ready dict.
- map_schedule_a_data: Converts schedule_a_medical.json to flattened dict.
- fill_claim_pdf: Loads template PDF, builds overlay page, merges, returns filled PDF bytes.

Inputs (expected existing files when main() runs):
- output/claim_form.json
- output/schedule_a_medical.json
- united.pdf (multi-page claim form template; target_page_index=1 used)
- form_1040_irs.pdf (Schedule A template; target_page_index=0)

Outputs:
- filled_claim.pdf (populated United-style claim form)
- irs_filled.pdf (populated Schedule A medical deduction section)

UI / upstream responsibilities:
- Generate JSON artifacts with required keys before invoking this module (handled by ocr_llm_reasoning_logic).
- Ensure template PDFs are present in project root.

Usage:
- From orchestrator: python3 main.py
- Standalone: python3 claim_file.py

Extend:
- Add new TemplateConfig entries in TEMPLATES for additional carriers/forms.
- Adjust coordinates or font sizes by modifying field configs.
"""

import io
from datetime import datetime
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
import json
from typing import Any, Callable, Mapping, Literal

from pypdf import PdfReader, PdfWriter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ValueTransform = Callable[[object], str]
DerivedValue = Callable[[Mapping[str, object]], object]
DataMap = Mapping[str, object]


@dataclass(frozen=True)
class TextFieldConfig:
    key: str
    rect: tuple[float, float, float, float] | None = None
    x: float | None = None
    y: float | None = None
    font_name: str = "Helvetica"
    font_size: float = 9
    align: Literal["left", "center", "right"] = "left"
    padding: float = 1.5
    baseline_offset: float = -2.0
    uppercase: bool = False
    max_width: float | None = None
    shrink_to_fit: bool = False
    min_font_size: float = 6.5
    multiline: bool = False
    line_height: float | None = None


@dataclass(frozen=True)
class BoxFieldConfig:
    key: str
    rect: tuple[float, float, float, float] | None = None
    x: float | None = None
    y: float | None = None
    box_width: float | None = None
    max_chars: int = 0
    digits_only: bool = False
    uppercase: bool = False
    font_name: str = "Helvetica"
    font_size: float = 10
    baseline_offset: float = -3.0
    side_padding: float = 1.0
    char_spacing: float = 0.0


@dataclass(frozen=True)
class CheckBoxFieldConfig:
    key: str
    rect: tuple[float, float, float, float] | None = None
    center_x: float | None = None
    center_y: float | None = None
    true_mark: str = "X"
    font_name: str = "Helvetica"
    font_size: float = 9.5
    baseline_offset: float = -2.5
    x_offset: float = 0.0
    y_offset: float = 0.0


@dataclass(frozen=True)
class TemplateConfig:
    target_page_index: int
    text_fields: tuple[TextFieldConfig, ...] = ()
    box_fields: tuple[BoxFieldConfig, ...] = ()
    checkbox_fields: tuple[CheckBoxFieldConfig, ...] = ()
    value_transforms: Mapping[str, ValueTransform] = field(default_factory=dict)
    derived_values: Mapping[str, DerivedValue] = field(default_factory=dict)
    global_text_y_offset: float = 0.0
    global_box_y_offset: float = 0.0
    global_checkbox_y_offset: float = 0.0


# -----------------------
# Value helpers
# -----------------------


def _normalize_gender(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip().upper()
    if text.startswith("M"):
        return "M"
    if text.startswith("F"):
        return "F"
    return ""


def _normalize_checkbox_mark(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    lowered = text.lower()
    if lowered in {"yes", "y", "true", "t", "1", "checked", "x"}:
        return "X"
    if lowered in {
        "no",
        "n",
        "false",
        "f",
        "0",
        "unchecked",
        "same as above",
        "same-as-above",
        "same",
    }:
        return ""
    return ""


def _extract_digits(value: object) -> str:
    if value is None:
        return ""
    return "".join(ch for ch in str(value) if ch.isdigit())


def _normalize_phone_digits(value: object) -> str:
    digits = _extract_digits(value)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) > 10:
        digits = digits[-10:]
    if len(digits) != 10:
        return ""
    return digits


_DATE_FORMATS = (
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%m/%d/%y",
    "%B %d %Y",
    "%b %d %Y",
    "%B %d, %Y",
    "%b %d, %Y",
    "%Y%m%d",
)


def _parse_date_to_digits(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    for fmt in _DATE_FORMATS:
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.strftime("%m%d%Y")
        except ValueError:
            continue
    digits = _extract_digits(text)
    if len(digits) == 8:
        return digits
    return ""


def _format_date_display(digits: str) -> str:
    if len(digits) != 8:
        return ""
    return f"{digits[:2]}/{digits[2:4]}/{digits[4:]}"


def _format_tax_id_text(value: object) -> str:
    digits = _extract_digits(value)
    if len(digits) == 9:
        return f"{digits[:2]}-{digits[2:]}"
    if digits:
        return digits
    if value is None:
        return ""
    return str(value).strip()


def _as_mapping(value: Any) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    return {}


def _format_currency(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    try:
        amount = Decimal(text)
    except (InvalidOperation, ValueError):
        return text
    quantized = amount.quantize(Decimal("0.01"))
    return f"{quantized:,.2f}"


def _wrap_text_to_width(
    text: str,
    font_name: str,
    font_size: float,
    max_width: float,
) -> list[str]:
    words = text.split()
    if not words:
        return [""]

    space_width = stringWidth(" ", font_name, font_size)
    lines: list[str] = []
    current_words: list[str] = []
    current_width = 0.0

    for word in words:
        word_width = stringWidth(word, font_name, font_size)
        if current_words:
            test_width = current_width + space_width + word_width
        else:
            test_width = word_width

        if current_words and test_width > max_width:
            lines.append(" ".join(current_words))
            current_words = [word]
            current_width = word_width
        else:
            current_words.append(word)
            current_width = test_width if current_words else 0.0

    if current_words:
        lines.append(" ".join(current_words))

    return lines


def _coerce_text_value(
    raw: object,
    transform: ValueTransform | None,
    uppercase: bool,
) -> str:
    if raw is None:
        return ""
    if transform is not None:
        resolved = transform(raw)
    elif isinstance(raw, bool):
        resolved = "X" if raw else ""
    else:
        resolved = str(raw)

    resolved = resolved.strip()
    if uppercase:
        resolved = resolved.upper()
    return resolved


def _prepare_box_value(value: str, config: BoxFieldConfig) -> str:
    if not value:
        return ""
    if config.digits_only:
        value = "".join(ch for ch in value if ch.isdigit())
    if config.uppercase:
        value = value.upper()
    if config.max_chars:
        value = value[: config.max_chars]
    return value


def _draw_text_field(
    c: canvas.Canvas,
    text: str,
    config: TextFieldConfig,
    global_offset: float = 0.0,
) -> None:
    if not text:
        return

    font_name = config.font_name
    font_size = config.font_size
    effective_max_width = config.max_width
    available_width = None

    if config.rect is not None:
        left, bottom, right, top = config.rect
        available_width = max(0.0, (right - left) - 2 * config.padding)
        if effective_max_width is None:
            effective_max_width = available_width
    text_width = stringWidth(text, font_name, font_size)

    if (
        effective_max_width is not None
        and text_width > effective_max_width
        and text_width > 0
    ):
        if config.rect is None and config.shrink_to_fit:
            scale = effective_max_width / text_width
            font_size = max(config.min_font_size, font_size * scale)
            text_width = stringWidth(text, font_name, font_size)

    if config.rect is not None:
        left, bottom, right, top = config.rect
        max_width = available_width or 0.0
        c.setFont(font_name, font_size)

        if config.multiline or "\n" in text:
            line_height = config.line_height or (font_size + 2.0)
            lines: list[str] = []
            for raw_line in text.splitlines():
                stripped = raw_line.strip()
                if not stripped:
                    lines.append("")
                    continue
                if max_width > 0:
                    lines.extend(
                        _wrap_text_to_width(stripped, font_name, font_size, max_width)
                    )
                else:
                    lines.append(stripped)

            if not lines:
                return

            cursor_y = (
                top
                + config.baseline_offset
                + global_offset
                - config.padding
                - font_size
            )
            for line in lines:
                if cursor_y < bottom:
                    break
                line_width = stringWidth(line, font_name, font_size)
                if config.align == "center":
                    text_x = (
                        left + config.padding + max(0.0, (max_width - line_width) / 2.0)
                    )
                elif config.align == "right":
                    text_x = right - config.padding - line_width
                else:
                    text_x = left + config.padding
                c.drawString(text_x, cursor_y, line)
                cursor_y -= line_height
            return

        # single line within rect
        if (
            config.shrink_to_fit
            and max_width
            and text_width > max_width
            and text_width > 0
        ):
            scale = max_width / text_width
            font_size = max(config.min_font_size, font_size * scale)
            text_width = stringWidth(text, font_name, font_size)
            c.setFont(font_name, font_size)

        if config.align == "left":
            text_x = left + config.padding
        elif config.align == "center":
            text_x = left + config.padding + max(0.0, (max_width - text_width) / 2.0)
        else:
            text_x = right - config.padding - text_width
        text_y = bottom + (top - bottom) / 2.0 + config.baseline_offset + global_offset
        c.drawString(text_x, text_y, text)
        return

    # Fallback to absolute coordinates
    if config.rect is not None:
        return

    c.setFont(font_name, font_size)
    if config.x is None or config.y is None:
        raise ValueError(
            f"Text field '{config.key}' must define either rect or x/y coordinates."
        )
    if config.align == "left":
        text_x = config.x
    elif config.align == "center":
        text_x = config.x - text_width / 2.0
    else:
        text_x = config.x - text_width
    text_y = config.y + config.baseline_offset + global_offset
    c.drawString(text_x, text_y, text)


def _draw_box_field(
    c: canvas.Canvas,
    text: str,
    config: BoxFieldConfig,
    global_offset: float = 0.0,
) -> None:
    if not text:
        return

    c.setFont(config.font_name, config.font_size)

    if config.rect is not None:
        left, bottom, right, top = config.rect
        usable_width = (right - left) - 2 * config.side_padding
        if usable_width <= 0:
            return
        if config.box_width is not None:
            box_width = config.box_width
        elif config.max_chars:
            box_width = usable_width / config.max_chars
        else:
            raise ValueError(
                f"Box field '{config.key}' needs max_chars when box_width is not set."
            )
        start_x = left + config.side_padding
        baseline = (
            bottom + (top - bottom) / 2.0 + config.baseline_offset + global_offset
        )
    else:
        if config.x is None or config.y is None or config.box_width is None:
            raise ValueError(
                f"Box field '{config.key}' must define rect or x/y/box_width."
            )
        start_x = config.x
        box_width = config.box_width
        baseline = config.y + config.baseline_offset + global_offset

    step = box_width + config.char_spacing

    for index, char in enumerate(text):
        center_x = start_x + step * index + (box_width / 2.0)
        c.drawCentredString(center_x, baseline, char)


def _draw_checkbox(
    c: canvas.Canvas,
    checked: bool,
    config: CheckBoxFieldConfig,
    global_offset: float = 0.0,
) -> None:
    if not checked:
        return
    if config.rect is not None:
        left, bottom, right, top = config.rect
        center_x = (left + right) / 2.0
        center_y = (bottom + top) / 2.0
    elif config.center_x is not None and config.center_y is not None:
        center_x = config.center_x
        center_y = config.center_y
    else:
        raise ValueError(
            f"Checkbox field '{config.key}' must define rect or center coordinates."
        )

    center_x += config.x_offset
    baseline = center_y + config.baseline_offset + config.y_offset + global_offset
    c.setFont(config.font_name, config.font_size)
    c.drawCentredString(center_x, baseline, config.true_mark)


# -----------------------
# Template definitions
# -----------------------


def _rect(
    left: float, bottom: float, right: float, top: float
) -> tuple[float, float, float, float]:
    return (float(left), float(bottom), float(right), float(top))


UNITED_TEXT_FIELDS: tuple[TextFieldConfig, ...] = (
    TextFieldConfig(
        "patient_name",
        rect=_rect(38.0734, 689.237, 321.102, 706.845),
        shrink_to_fit=True,
        padding=2.0,
    ),
    TextFieldConfig("patient_address", rect=_rect(38.0734, 663.109, 321.102, 680.718)),
    TextFieldConfig("patient_city", rect=_rect(38.0734, 635.101, 195.931, 652.71)),
    TextFieldConfig(
        "patient_state",
        rect=_rect(205.271, 636.366, 236.134, 652.261),
        align="center",
        uppercase=True,
    ),
    TextFieldConfig("provider_name", rect=_rect(39.0734, 453.304, 322.102, 470.913)),
    TextFieldConfig("provider_npi", rect=_rect(39.0734, 427.507, 322.102, 445.116)),
    TextFieldConfig(
        "provider_group_name",
        rect=_rect(351.723, 427.494, 593.193, 445.103),
        shrink_to_fit=True,
        padding=2.0,
    ),
    TextFieldConfig("provider_address", rect=_rect(40.0734, 401.697, 323.102, 419.306)),
    TextFieldConfig("service_address", rect=_rect(351.723, 401.697, 593.193, 419.306)),
    TextFieldConfig("provider_city", rect=_rect(39.0734, 375.217, 196.931, 392.825)),
    TextFieldConfig(
        "provider_state",
        rect=_rect(202.271, 374.955, 233.134, 390.85),
        align="center",
        uppercase=True,
    ),
    TextFieldConfig("other_ins_name", rect=_rect(39.0734, 213.413, 388.866, 231.022)),
    TextFieldConfig(
        "other_ins_carrier", rect=_rect(39.0734, 184.613, 194.793, 202.222)
    ),
    TextFieldConfig(
        "other_ins_policy_number", rect=_rect(204.019, 184.613, 390.175, 202.222)
    ),
    TextFieldConfig(
        "other_ins_employer", rect=_rect(402.673, 184.613, 588.829, 202.222)
    ),
    TextFieldConfig("other_ins_cancel", x=270.0, y=175.0, align="center"),
    TextFieldConfig("other_ins_eob_attached", x=525.0, y=165.0, align="center"),
    TextFieldConfig("signature", rect=_rect(83.2579, 75.4594, 391.102, 90.8534)),
    TextFieldConfig(
        "accident_description",
        rect=_rect(39.0734, 275.268, 590.727, 323.771),
        multiline=True,
        line_height=11.5,
        padding=3.0,
    ),
)

SCHEDULE_A_TEXT_FIELDS: tuple[TextFieldConfig, ...] = (
    TextFieldConfig(
        "schedule_a_taxpayer_name",
        rect=_rect(36.0, 684.0, 474.45, 698.001),
        padding=4.0,
        shrink_to_fit=True,
    ),
    TextFieldConfig(
        "schedule_a_total_expenses",
        rect=_rect(417.6, 660.0, 488.85, 672.001),
        align="right",
        padding=2.0,
    ),
    TextFieldConfig(
        "schedule_a_adjusted_gross_income",
        rect=_rect(331.2, 648.0, 402.45, 659.999),
        align="right",
        padding=2.0,
    ),
    TextFieldConfig(
        "schedule_a_seven_point_five_percent",
        rect=_rect(417.6, 636.001, 488.85, 648.0),
        align="right",
        padding=2.0,
    ),
    TextFieldConfig(
        "schedule_a_deduction_amount",
        rect=_rect(504.0, 624.002, 576.0, 636.001),
        align="right",
        padding=2.0,
    ),
)

SCHEDULE_A_BOX_FIELDS: tuple[BoxFieldConfig, ...] = ()
SCHEDULE_A_CHECKBOX_FIELDS: tuple[CheckBoxFieldConfig, ...] = ()

UNITED_BOX_FIELDS: tuple[BoxFieldConfig, ...] = (
    BoxFieldConfig(
        "member_id",
        rect=_rect(38.7016, 743.169, 211.432, 760.569),
        max_chars=13,
        digits_only=True,
        side_padding=2.0,
    ),
    BoxFieldConfig(
        "group_number",
        rect=_rect(352.901, 743.419, 463.106, 760.819),
        max_chars=9,
        digits_only=True,
        side_padding=2.0,
    ),
    BoxFieldConfig(
        "patient_dob_mm",
        rect=_rect(352.759, 689.493, 384.124, 704.886),
        max_chars=2,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "patient_dob_dd",
        rect=_rect(399.234, 689.493, 431.603, 704.886),
        max_chars=2,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "patient_dob_yyyy",
        rect=_rect(445.208, 689.493, 508.058, 704.886),
        max_chars=4,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "patient_zip",
        rect=_rect(242.138, 636.868, 321.484, 652.261),
        max_chars=5,
        digits_only=True,
        side_padding=2.0,
    ),
    BoxFieldConfig(
        "patient_phone_area",
        rect=_rect(44.6899, 609.983, 92.0486, 624.875),
        max_chars=3,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "patient_phone_prefix",
        rect=_rect(102.644, 609.983, 149.239, 624.875),
        max_chars=3,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "patient_phone_line",
        rect=_rect(160.336, 609.983, 223.187, 624.875),
        max_chars=4,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "provider_zip",
        rect=_rect(242.138, 375.456, 321.484, 390.85),
        max_chars=5,
        digits_only=True,
        side_padding=2.0,
    ),
    BoxFieldConfig(
        "provider_phone_area",
        rect=_rect(359.871, 375.456, 407.229, 390.85),
        max_chars=3,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "provider_phone_prefix",
        rect=_rect(417.825, 375.456, 464.42, 390.85),
        max_chars=3,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "provider_phone_line",
        rect=_rect(475.517, 375.456, 538.368, 390.85),
        max_chars=4,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "provider_tax_id",
        rect=_rect(351.199, 453.304, 592.669, 470.913),
        max_chars=9,
        digits_only=True,
        side_padding=3.0,
    ),
    BoxFieldConfig(
        "signature_date_mm",
        rect=_rect(431.478, 76.0843, 462.843, 91.4778),
        max_chars=2,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "signature_date_dd",
        rect=_rect(476.953, 76.0843, 507.577, 91.4778),
        max_chars=2,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "signature_date_yyyy",
        rect=_rect(522.927, 76.0843, 585.778, 91.4778),
        max_chars=4,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "other_ins_dob_mm",
        rect=_rect(402.623, 212.885, 433.988, 228.279),
        max_chars=2,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "other_ins_dob_dd",
        rect=_rect(449.098, 212.885, 479.721, 228.279),
        max_chars=2,
        digits_only=True,
        side_padding=1.5,
    ),
    BoxFieldConfig(
        "other_ins_dob_yyyy",
        rect=_rect(495.072, 212.885, 557.922, 228.279),
        max_chars=4,
        digits_only=True,
        side_padding=1.5,
    ),
)

UNITED_CHECKBOX_FIELDS: tuple[CheckBoxFieldConfig, ...] = (
    CheckBoxFieldConfig(
        "patient_gender_male",
        center_x=402.33995056152344,
        center_y=672.6783294677734,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "patient_gender_female",
        center_x=422.40843200683594,
        center_y=672.6783294677734,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "patient_relationship_subscriber",
        center_x=493.4320983886719 - 9.0,
        center_y=653.0521697998047,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "patient_new_address_yes",
        center_x=425.2746887207031 - 11.0,
        center_y=507.82786560058594,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "patient_new_address_no",
        center_x=452.4590148925781 - 11.0,
        center_y=507.82786560058594,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "policyholder_new_address_yes",
        center_x=426.0497131347656 - 11.0,
        center_y=651.0132293701172,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "policyholder_new_address_no",
        center_x=453.2326965332031 - 11.0,
        center_y=651.0132293701172,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "other_insurance_yes",
        center_x=249.09170532226562 - 10.5,
        center_y=250.73385620117188,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "other_insurance_no",
        center_x=278.3912048339844 - 10.5,
        center_y=250.73385620117188,
        baseline_offset=-3.0,
    ),
    CheckBoxFieldConfig(
        "assignment_of_benefits", rect=_rect(39.2726, 122.434, 48.5454, 131.347)
    ),
)


def _slice_digits(source_key: str, start: int, length: int) -> DerivedValue:
    def getter(data: DataMap) -> str:
        digits = _extract_digits(data.get(source_key))
        return digits[start : start + length]

    return getter


UNITED_DERIVED_VALUES: Mapping[str, DerivedValue] = {
    "patient_phone_area": _slice_digits("patient_phone", 0, 3),
    "patient_phone_prefix": _slice_digits("patient_phone", 3, 3),
    "patient_phone_line": _slice_digits("patient_phone", 6, 4),
    "patient_dob_mm": _slice_digits("patient_dob", 0, 2),
    "patient_dob_dd": _slice_digits("patient_dob", 2, 2),
    "patient_dob_yyyy": _slice_digits("patient_dob", 4, 4),
    "policyholder_phone_area": _slice_digits("policyholder_phone", 0, 3),
    "policyholder_phone_prefix": _slice_digits("policyholder_phone", 3, 3),
    "policyholder_phone_line": _slice_digits("policyholder_phone", 6, 4),
    "policyholder_dob_mm": _slice_digits("policyholder_dob", 0, 2),
    "policyholder_dob_dd": _slice_digits("policyholder_dob", 2, 2),
    "policyholder_dob_yyyy": _slice_digits("policyholder_dob", 4, 4),
    "provider_phone_area": _slice_digits("provider_phone", 0, 3),
    "provider_phone_prefix": _slice_digits("provider_phone", 3, 3),
    "provider_phone_line": _slice_digits("provider_phone", 6, 4),
    "provider_tax_id": _slice_digits("provider_tax_id", 0, 9),
    "signature_date_mm": _slice_digits("signature_date_text", 0, 2),
    "signature_date_dd": _slice_digits("signature_date_text", 2, 2),
    "signature_date_yyyy": _slice_digits("signature_date_text", 4, 4),
    "other_ins_dob_mm": _slice_digits("other_ins_dob", 0, 2),
    "other_ins_dob_dd": _slice_digits("other_ins_dob", 2, 2),
    "other_ins_dob_yyyy": _slice_digits("other_ins_dob", 4, 4),
}

UNITED_VALUE_TRANSFORMS: Mapping[str, ValueTransform] = {
    "other_ins_eob_attached": _normalize_checkbox_mark,
}

UNITED_TEMPLATE = TemplateConfig(
    target_page_index=1,
    text_fields=UNITED_TEXT_FIELDS,
    box_fields=UNITED_BOX_FIELDS,
    checkbox_fields=UNITED_CHECKBOX_FIELDS,
    value_transforms=UNITED_VALUE_TRANSFORMS,
    derived_values=UNITED_DERIVED_VALUES,
)

SCHEDULE_A_TEMPLATE = TemplateConfig(
    target_page_index=0,
    text_fields=SCHEDULE_A_TEXT_FIELDS,
    box_fields=SCHEDULE_A_BOX_FIELDS,
    checkbox_fields=SCHEDULE_A_CHECKBOX_FIELDS,
)


def map_backend_to_claim_data(payload: Mapping[str, Any]) -> dict[str, object]:
    member = _as_mapping(payload.get("member_information"))
    patient = _as_mapping(payload.get("patient_information"))
    provider = _as_mapping(payload.get("provider_information"))
    accident = _as_mapping(payload.get("accident_information"))
    other_ins = _as_mapping(payload.get("other_insurance_information"))

    patient_dob_digits = _parse_date_to_digits(patient.get("date_of_birth"))
    other_ins_dob_digits = _parse_date_to_digits(
        other_ins.get("other_insurance_person_dob")
    )
    other_ins_cancel_digits = _parse_date_to_digits(
        other_ins.get("other_cancellation_date")
    )

    patient_phone_digits = _normalize_phone_digits(patient.get("phone_number"))
    provider_phone_digits = _normalize_phone_digits(provider.get("phone_number"))

    signature_date_digits = datetime.today().strftime("%m%d%Y")

    def _is_truthy(value: object) -> bool:
        return str(value).strip().lower() in {
            "yes",
            "y",
            "true",
            "t",
            "1",
            "checked",
            "x",
        }

    def _is_falsey(value: object) -> bool:
        return str(value).strip().lower() in {
            "no",
            "n",
            "false",
            "f",
            "0",
            "unchecked",
            "same as above",
            "same-as-above",
            "same",
        }

    other_plan_value = other_ins.get("covered_by_other_plan")
    patient_new_address_value = patient.get("new_address")
    relationship_value = (
        str(patient.get("relationship_to_policyholder", "")).strip().lower()
    )
    patient_gender_value = str(patient.get("gender", "")).strip().lower()

    data: dict[str, object] = {
        "member_id": _extract_digits(member.get("member_id_number")),
        "group_number": _extract_digits(member.get("group_number")),
        "patient_name": patient.get("patient_name", ""),
        "patient_address": patient.get("home_address", ""),
        "patient_city": patient.get("city", ""),
        "patient_state": patient.get("state", ""),
        "patient_zip": _extract_digits(patient.get("zip_code")),
        "patient_phone": patient_phone_digits,
        "patient_dob": patient_dob_digits,
        "provider_name": provider.get("provider_name", ""),
        "provider_tax_id": _extract_digits(provider.get("provider_tax_id")),
        "provider_npi": _extract_digits(provider.get("npi")),
        "provider_group_name": provider.get("group_or_facility_name", ""),
        "provider_address": provider.get("provider_address", ""),
        "service_address": provider.get("services_rendered_address", ""),
        "provider_city": provider.get("city", ""),
        "provider_state": provider.get("state", ""),
        "provider_zip": _extract_digits(provider.get("zip_code")),
        "provider_phone": provider_phone_digits,
        "other_ins_name": other_ins.get("other_insurance_person_name", ""),
        "other_ins_carrier": other_ins.get("other_insurance_carrier", ""),
        "other_ins_policy_number": other_ins.get("other_policy_number", ""),
        "other_ins_employer": other_ins.get("other_employer_name", ""),
        "other_ins_cancel": _format_date_display(other_ins_cancel_digits),
        "other_ins_eob_attached": other_ins.get("eob_attached", ""),
        "other_ins_dob": other_ins_dob_digits,
        "signature": patient.get("patient_name", ""),
        "signature_date_text": signature_date_digits,
        "accident_description": accident.get("description", ""),
    }

    data["patient_gender_male"] = patient_gender_value.startswith("m")
    data["patient_gender_female"] = patient_gender_value.startswith("f")

    data["patient_relationship_subscriber"] = (
        "subscriber" in relationship_value or "policyholder" in relationship_value
    )

    patient_new_addr_truthy = _is_truthy(patient_new_address_value)
    data["patient_new_address_yes"] = patient_new_addr_truthy
    data["patient_new_address_no"] = not patient_new_addr_truthy
    data["policyholder_new_address_yes"] = patient_new_addr_truthy
    data["policyholder_new_address_no"] = not patient_new_addr_truthy

    other_plan_truthy = _is_truthy(other_plan_value)
    other_plan_falsey = _is_falsey(other_plan_value) or (
        not other_plan_truthy and other_plan_value is not None
    )
    data["other_insurance_yes"] = other_plan_truthy
    data["other_insurance_no"] = other_plan_falsey

    data["assignment_of_benefits"] = _is_truthy(other_ins.get("assignment_of_benefits"))

    cleaned: dict[str, object] = {}
    for key, value in data.items():
        if value is None:
            continue
        if isinstance(value, str):
            cleaned[key] = value.strip()
        else:
            cleaned[key] = value
    return cleaned


def map_schedule_a_data(payload: Mapping[str, Any]) -> dict[str, object]:
    taxpayer = _as_mapping(payload.get("taxpayer_information"))
    medical = _as_mapping(payload.get("medical_and_dental_expenses"))

    return {
        "schedule_a_taxpayer_name": taxpayer.get("name", ""),
        "schedule_a_total_expenses": _format_currency(medical.get("total_expenses")),
        "schedule_a_adjusted_gross_income": _format_currency(
            medical.get("adjusted_gross_income")
        ),
        "schedule_a_seven_point_five_percent": _format_currency(
            medical.get("seven_point_five_percent_of_agi")
        ),
        "schedule_a_deduction_amount": _format_currency(
            medical.get("deduction_amount")
        ),
    }


# Kaiser template placeholder – tweak coordinates to match Kaiser form geometry.
KAISER_TEMPLATE = TemplateConfig(
    target_page_index=1,
    text_fields=UNITED_TEXT_FIELDS,
    box_fields=UNITED_BOX_FIELDS,
    checkbox_fields=UNITED_CHECKBOX_FIELDS,
    value_transforms=UNITED_VALUE_TRANSFORMS,
    derived_values=UNITED_DERIVED_VALUES,
)


TEMPLATES: dict[str, TemplateConfig] = {
    "united": UNITED_TEMPLATE,
    "kaiser": KAISER_TEMPLATE,
    "schedule_a": SCHEDULE_A_TEMPLATE,
}


# -----------------------
# Core API
# -----------------------


def fill_claim_pdf(template_name: str, template_path: str, data: DataMap) -> bytes:
    template_key = template_name.lower()
    if template_key not in TEMPLATES:
        supported = ", ".join(sorted(TEMPLATES))
        raise ValueError(
            f"Unknown template '{template_name}'. Supported templates: {supported}"
        )

    template = TEMPLATES[template_key]
    reader = PdfReader(template_path)
    writer = PdfWriter()

    if template.target_page_index >= len(reader.pages):
        raise ValueError(
            f"Template '{template_name}' expects at least {template.target_page_index + 1} pages "
            f"but '{template_path}' only has {len(reader.pages)}."
        )

    target_page = reader.pages[template.target_page_index]
    width = float(target_page.mediabox.width)
    height = float(target_page.mediabox.height)

    overlay_reader = _create_overlay_page(data, width, height, template)
    overlay_page = overlay_reader.pages[0]

    for index, page in enumerate(reader.pages):
        if index == template.target_page_index:
            page.merge_page(overlay_page)
        writer.add_page(page)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output.read()


def _create_overlay_page(
    data: DataMap,
    width: float,
    height: float,
    template: TemplateConfig,
) -> PdfReader:
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(width, height))

    resolved_cache: dict[str, object] = {}

    def resolve_value(key: str) -> object:
        if key in resolved_cache:
            return resolved_cache[key]
        if key in data:
            resolved_cache[key] = data[key]
            return resolved_cache[key]
        if key in template.derived_values:
            resolved_cache[key] = template.derived_values[key](data)
            return resolved_cache[key]
        resolved_cache[key] = None
        return None

    for field in template.text_fields:
        raw_value = resolve_value(field.key)
        text_value = _coerce_text_value(
            raw_value,
            template.value_transforms.get(field.key),
            field.uppercase,
        )
        _draw_text_field(c, text_value, field, template.global_text_y_offset)

    for field in template.box_fields:
        raw_value = resolve_value(field.key)
        text_value = _coerce_text_value(
            raw_value,
            template.value_transforms.get(field.key),
            field.uppercase,
        )
        box_value = _prepare_box_value(text_value, field)
        _draw_box_field(c, box_value, field, template.global_box_y_offset)

    for field in template.checkbox_fields:
        raw_value = resolve_value(field.key)
        checked = bool(raw_value) and str(raw_value).strip().lower() not in {
            "",
            "false",
            "0",
            "no",
        }
        _draw_checkbox(c, checked, field, template.global_checkbox_y_offset)

    c.save()
    packet.seek(0)
    return PdfReader(packet)


def main() -> None:
    try:
        from status_manager import update_status
    except ImportError:
        def update_status(step, message=None, error=None):
            pass
    
    update_status("claim_generation", "Generating claim form PDF...")
    with open("output/claim_form.json", "r", encoding="utf-8") as f:
        backend_payload = json.load(f)

    claim_data = map_backend_to_claim_data(backend_payload)

    filled_bytes = fill_claim_pdf("united", "united.pdf", claim_data)
    with open("filled_claim.pdf", "wb") as fh:
        fh.write(filled_bytes)

    print("Filled PDF saved as: filled_claim.pdf")

    update_status("tax_documents", "Preparing tax deduction forms...")
    with open("output/schedule_a_medical.json", "r", encoding="utf-8") as f:
        schedule_a_payload = json.load(f)

    schedule_a_data = map_schedule_a_data(schedule_a_payload)
    schedule_a_bytes = fill_claim_pdf(
        "schedule_a", "form_1040_irs.pdf", schedule_a_data
    )
    with open("irs_filled.pdf", "wb") as fh:
        fh.write(schedule_a_bytes)

    print("Schedule A PDF saved as: irs_filled.pdf")


if __name__ == "__main__":
    main()
