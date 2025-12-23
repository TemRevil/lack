import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';

const DropdownMenu = ({ options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const [isUp, setIsUp] = useState(false);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            // Check if we should open upward
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 200) { // If less than 200px space, go up
                setIsUp(true);
            } else {
                setIsUp(false);
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="action-cell" ref={menuRef}>
            <button className="btn-icon" onClick={handleToggle}>
                <MoreVertical size={18} />
            </button>
            <div
                className={`action-menu ${isOpen ? 'show' : ''} ${isUp ? 'show-up' : ''}`}
                onClick={e => e.stopPropagation()}
            >
                {options.map((opt, i) => (
                    <div
                        key={i}
                        className={`action-menu-item ${opt.className || ''}`}
                        onClick={() => {
                            opt.onClick();
                            setIsOpen(false);
                        }}
                    >
                        {opt.icon}
                        <span>{opt.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DropdownMenu;
