import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const CustomDatePicker = ({ value, onChange }) => {
    const { t, settings } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

    // Sync viewDate with value prop changes
    useEffect(() => {
        if (value) {
            setViewDate(new Date(value));
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const startDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const monthsAr = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const monthsEn = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const weekDaysAr = ["أحد", "نثين", "ثلث", "ربع", "خمس", "جمعة", "سبت"];
    const weekDaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const currentLang = settings.language || 'ar';
    const months = currentLang === 'ar' ? monthsAr : monthsEn;
    const weekDays = currentLang === 'ar' ? weekDaysAr : weekDaysEn;

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateSelect = (day) => {
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Fix for timezone
        const offset = selected.getTimezoneOffset();
        const adjustedDate = new Date(selected.getTime() - (offset * 60 * 1000));
        onChange(adjustedDate.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const isSelected = (day) => {
        if (!value) return false;
        const d = new Date(value);
        return d.getFullYear() === viewDate.getFullYear() &&
            d.getMonth() === viewDate.getMonth() &&
            d.getDate() === day;
    };

    const renderCalendar = () => {
        const days = [];
        const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const startDay = startDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

        // Empty slots for start of month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Actual days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let d = 1; d <= totalDays; d++) {
            const currentIterDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
            const isFuture = currentIterDate > today;

            days.push(
                <div
                    key={d}
                    className={`calendar-day ${isSelected(d) ? 'selected' : ''} ${isFuture ? 'disabled' : ''}`}
                    onClick={() => !isFuture && handleDateSelect(d)}
                >
                    {d}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="custom-datepicker" ref={containerRef}>
            <div className="datepicker-input" onClick={() => setIsOpen(!isOpen)}>
                <CalendarIcon size={18} />
                <span>{value ? new Date(value).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US') : t('chooseDate')}</span>
            </div>

            {isOpen && (
                <div className="datepicker-dropdown">
                    <div className="datepicker-header">
                        <button onClick={handleNextMonth}><ChevronRight size={18} /></button>
                        <div className="current-month">
                            {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </div>
                        <button onClick={handlePrevMonth}><ChevronLeft size={18} /></button>
                    </div>

                    <div className="calendar-grid">
                        {weekDays.map(wd => (
                            <div key={wd} className="weekday-label">{wd}</div>
                        ))}
                        {renderCalendar()}
                    </div>

                    <div className="datepicker-footer">
                        <button className="btn-today" onClick={() => {
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            const day = String(now.getDate()).padStart(2, '0');
                            const today = `${year}-${month}-${day}`;

                            onChange(today);
                            setViewDate(new Date());
                            setIsOpen(false);
                        }}>{t('today')}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;
