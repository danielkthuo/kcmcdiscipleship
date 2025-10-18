/**
 * UNIVERSAL AUTO-SAVE MODULE
 * Automatically saves and restores all form inputs on any page
 * using localStorage.
 * Works for: input, textarea, select (text, checkbox, radio, etc.)
 * Author: Daniel Thuo (2025 Edition)
 */

(function() {
    document.addEventListener('DOMContentLoaded', function() {

        const SAVE_DELAY = 1000; // milliseconds after user stops typing
        const PAGE_KEY_PREFIX = `autosave_${window.location.pathname.replace(/\W+/g, '_')}_`;

        // Identify all savable fields (you can expand the selector if needed)
        const fields = document.querySelectorAll('input, textarea, select');

        fields.forEach(field => {
            const fieldKey = PAGE_KEY_PREFIX + (field.id || field.name || generateFieldKey(field));

            // Restore saved value
            const savedValue = localStorage.getItem(fieldKey);
            if (savedValue !== null) {
                restoreFieldValue(field, savedValue);
            }

            // Detect changes and auto-save
            let saveTimeout;
            field.addEventListener('input', () => handleAutoSave(field, fieldKey));
            field.addEventListener('change', () => handleAutoSave(field, fieldKey));

            function handleAutoSave(fld, key) {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    saveFieldValue(fld, key);
                }, SAVE_DELAY);
            }
        });

        // Save function
        function saveFieldValue(field, key) {
            let value;

            if (field.type === 'checkbox') {
                value = field.checked;
            } else if (field.type === 'radio') {
                if (field.checked) value = field.value;
                else return;
            } else {
                value = field.value;
            }

            localStorage.setItem(key, value);
            showSaveIndicator(field);
        }

        // Restore function
        function restoreFieldValue(field, value) {
            if (field.type === 'checkbox') {
                field.checked = (value === 'true');
            } else if (field.type === 'radio') {
                if (field.value === value) field.checked = true;
            } else {
                field.value = value;
            }
        }

        // Generate a fallback key if field lacks ID or name
        function generateFieldKey(field) {
            return 'field_' + Array.from(document.querySelectorAll('input, textarea, select')).indexOf(field);
        }

        // Simple save indicator (appears briefly beside field)
        function showSaveIndicator(field) {
            const indicator = document.createElement('span');
            indicator.textContent = '✓ Saved';
            indicator.className = 'autosave-indicator';
            indicator.style.position = 'absolute';
            indicator.style.background = '#4caf50';
            indicator.style.color = 'white';
            indicator.style.fontSize = '0.7rem';
            indicator.style.padding = '2px 6px';
            indicator.style.borderRadius = '4px';
            indicator.style.marginLeft = '8px';
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.3s ease';
            
            // Place near field
            const parent = field.parentNode;
            parent.style.position = 'relative';
            parent.appendChild(indicator);

            // Animate
            setTimeout(() => indicator.style.opacity = '1', 50);
            setTimeout(() => indicator.style.opacity = '0', 1500);
            setTimeout(() => indicator.remove(), 2000);
        }

        console.log('✅ Universal AutoSave active for this page.');
    });
})();
