export class View {
  constructor() {
    // Escapar HTML
    this.esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    // Contenedores
    this.grid = document.getElementById('grid');
    this.legendContainer = document.getElementById('legend-container');
    this.scheduleContent = document.getElementById('schedule-content');
    this.notesView = document.getElementById('notes-view');
    this.actionsBar = document.querySelector('.actions');
    this.notesContainer = document.getElementById('notes-container');
    this.toastEl = document.getElementById('toast');

    // Modales
    this.overlay = document.getElementById('overlay');
    this.mTitle = document.getElementById('m-title');
    this.mMeta = document.getElementById('m-meta');
    this.mInput = document.getElementById('m-input');

    this.adminOverlay = document.getElementById('admin-overlay');
    this.adminShiftsList = document.getElementById('admin-shifts-list');

    this.catOverlay = document.getElementById('cat-overlay');
    this.catList = document.getElementById('cat-list');

    // Botones globales
    this.btnEditToggle = document.getElementById('edit-toggle');
    this.btnClear = document.getElementById('btn-clear');
    
    this._tt = null;
  }

  // --- Helpers ---
  el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.toastEl.classList.remove('show'), 3200);
  }

  setConnStatus(state, label) {
    const dot = document.getElementById('conn-dot');
    const text = document.getElementById('conn-label');
    if (dot && text) {
      dot.className = 'conn-dot ' + state;
      text.textContent = label;
    }
  }

  showSetupBanner(show) {
    const banner = document.getElementById('setup-banner');
    if (banner) banner.style.display = show ? 'block' : 'none';
  }

  // --- Render Schedule ---
  renderMode(isEditMode) {
    if (isEditMode) {
      this.btnEditToggle.innerHTML = '✅ Modo Edición (Activo)';
      this.btnEditToggle.style.background = 'var(--green)';
      this.btnEditToggle.style.borderColor = 'var(--green)';
      this.btnClear.style.display = 'inline-flex';
      this.toast('✏️ Modo edición activado');
    } else {
      this.btnEditToggle.innerHTML = '✏️ Modo Visualización';
      this.btnEditToggle.style.background = 'var(--purple)';
      this.btnEditToggle.style.borderColor = 'var(--purple)';
      this.btnClear.style.display = 'none';
      this.toast('👁 Modo de solo lectura');
    }
  }

  renderLegend(shifts, palette) {
    this.legendContainer.innerHTML = '';
    shifts.forEach((shift, index) => {
      const color = palette[index % palette.length];
      this.legendContainer.innerHTML += `<span class="leg"><span class="leg-dot" style="background:${color.acc}"></span>${this.esc(shift.label)} (${this.esc(shift.hours)})</span>`;
    });
  }

  renderGrid(data, shifts, days, palette, isEditMode, onOpenModal, onRemoveName) {
    this.grid.innerHTML = '';
    
    const mxDateStr = new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"});
    const mxDate = new Date(mxDateStr);
    const currentGridDay = mxDate.getDay() === 0 ? 6 : mxDate.getDay() - 1;

    // Headers
    const corner = this.el('div', 'corner'); 
    this.grid.appendChild(corner);
    
    days.forEach((day, i) => {
      const d = this.el('div', 'dh ' + (i >= 5 ? 'wknd' : 'wkd'));
      if (i < currentGridDay) d.classList.add('past-day');
      d.textContent = day;
      this.grid.appendChild(d);
    });

    // Rows
    shifts.forEach((shift, index) => {
      const color = palette[index % palette.length];
      const lbl = this.el('div', 'slabel');
      lbl.innerHTML = `<span class="sname">${this.esc(shift.label)}</span><span class="shours">${this.esc(shift.hours)}</span>`;
      lbl.style.background = color.bg;
      lbl.style.color      = color.acc;
      this.grid.appendChild(lbl);

      days.forEach((day, i) => {
        const cell = this.el('div', 'dcell');
        cell.style.background = color.bg;
        if (i < currentGridDay) cell.classList.add('past-day');
        
        const name = data[day] && data[day][shift.id];

        if (name) {
          const card = this.el('div', 'name-card');
          if (isEditMode) {
            card.innerHTML = `
              <span class="name-text">${this.esc(name)}</span>
              <button class="ic-btn edit" title="Editar">✏️</button>
              <button class="ic-btn del" title="Quitar">✕</button>
            `;
            card.querySelector('.edit').onclick = () => onOpenModal(day, shift.id, true, name);
            card.querySelector('.del').onclick = () => onRemoveName(day, shift.id, name);
          } else {
            card.innerHTML = `<span class="name-text" style="font-size:1.05rem">${this.esc(name)}</span>`;
          }
          cell.appendChild(card);
        } else {
          if (isEditMode) {
            const btn = this.el('button', 'add-btn');
            btn.innerHTML = '＋ Agregar nombre';
            btn.onclick = () => onOpenModal(day, shift.id, false, '');
            cell.appendChild(btn);
          }
        }
        this.grid.appendChild(cell);
      });
    });
  }

  // --- Render Notes (Expediente) ---
  renderNotes(categories, onNotesInput) {
    // Verificar si la estructura (IDs y Títulos) cambió para evitar recrear todo y perder foco
    const currentStructure = Array.from(this.notesContainer.children).map(child => ({
      id: child.dataset.id,
      title: child.querySelector('h3').textContent
    }));

    const newStructure = categories.map(c => ({ id: c.id, title: c.title }));
    const isSameStructure = JSON.stringify(currentStructure) === JSON.stringify(newStructure);

    if (!isSameStructure) {
      this.notesContainer.innerHTML = '';
      categories.forEach((cat, index) => {
        const acc = this.el('div', 'accordion');
        acc.dataset.id = cat.id;
        
        const header = this.el('div', 'accordion-header');
        header.innerHTML = `
          <h3>${this.esc(cat.title)}</h3>
          <span class="accordion-icon">▼</span>
        `;
        header.onclick = () => acc.classList.toggle('open');
        
        const content = this.el('div', 'accordion-content');
        
        // Vista Renderizada (Markdown)
        const renderedView = this.el('div', 'md-content');
        renderedView.innerHTML = window.marked ? window.marked.parse(cat.content || '*Aún no hay información.*', { breaks: true }) : this.esc(cat.content || 'Aún no hay información.');
        
        // Editor View
        const editorView = this.el('div', 'editor-view');
        editorView.style.display = 'none';
        
        const textarea = this.el('textarea', '');
        textarea.placeholder = `Escribe aquí la información para: ${this.esc(cat.title)}\nPuedes usar Markdown (**, *, #, etc.)`;
        textarea.value = cat.content || '';
        
        let debounceTimeout;
        textarea.addEventListener('input', (e) => {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            onNotesInput(cat.id, e.target.value);
          }, 800);
        });
        
        // Botones de toggle
        const btnEdit = this.el('button', 'btn');
        btnEdit.style.marginTop = '0.8rem';
        btnEdit.style.background = 'rgba(189,147,249,0.15)';
        btnEdit.style.color = 'var(--purple)';
        btnEdit.style.border = '1px solid rgba(189,147,249,0.4)';
        btnEdit.innerHTML = '✏️ Editar Notas';
        
        const btnSave = this.el('button', 'btn');
        btnSave.style.marginTop = '0.5rem';
        btnSave.style.background = 'var(--green)';
        btnSave.style.color = '#000';
        btnSave.innerHTML = '👁 Ver Formato';

        btnEdit.onclick = () => {
          renderedView.style.display = 'none';
          btnEdit.style.display = 'none';
          editorView.style.display = 'block';
          textarea.focus();
        };

        btnSave.onclick = () => {
          editorView.style.display = 'none';
          renderedView.style.display = 'block';
          btnEdit.style.display = 'inline-flex';
          renderedView.innerHTML = window.marked ? window.marked.parse(textarea.value || '*Aún no hay información.*', { breaks: true }) : this.esc(textarea.value || 'Aún no hay información.');
        };
        
        editorView.appendChild(textarea);
        editorView.appendChild(btnSave);

        content.appendChild(renderedView);
        content.appendChild(btnEdit);
        content.appendChild(editorView);
        
        acc.appendChild(header);
        acc.appendChild(content);
        
        // Primera categoría abierta por defecto
        if (index === 0) acc.classList.add('open');
        
        this.notesContainer.appendChild(acc);
      });
    } else {
      // Misma estructura, solo actualizar contenidos de forma segura
      categories.forEach((cat) => {
        const acc = this.notesContainer.querySelector(`.accordion[data-id="${cat.id}"]`);
        if (acc) {
          const textarea = acc.querySelector('textarea');
          const renderedView = acc.querySelector('.md-content');
          
          // Solo actualizamos si el usuario no está editando activamente ESTE textarea
          if (document.activeElement !== textarea) {
            textarea.value = cat.content || '';
            renderedView.innerHTML = window.marked ? window.marked.parse(cat.content || '*Aún no hay información.*', { breaks: true }) : this.esc(cat.content || 'Aún no hay información.');
          }
        }
      });
    }
  }

  toggleView(viewName) {
    if (viewName === 'notes') {
      this.scheduleContent.style.display = 'none';
      this.actionsBar.style.display = 'none';
      this.legendContainer.style.display = 'none';
      this.notesView.style.display = 'block';
    } else {
      this.notesView.style.display = 'none';
      this.scheduleContent.style.display = 'block';
      this.actionsBar.style.display = 'flex';
      this.legendContainer.style.display = 'flex';
    }
  }

  // --- Name Modal ---
  openNameModal(day, shiftLabel, shiftHours, editing, initialName) {
    this.mTitle.textContent = (editing ? 'Editar nombre' : 'Agregar nombre') + ` — ${shiftLabel}`;
    this.mMeta.textContent = `${day} · ${shiftHours}`;
    this.mInput.value = initialName;
    this.mInput.style.borderColor = '';
    this.overlay.classList.add('open');
    setTimeout(() => this.mInput.focus(), 80);
  }

  closeNameModal() {
    this.overlay.classList.remove('open');
  }

  showNameModalError() {
    this.mInput.style.borderColor = 'var(--red)';
    setTimeout(() => this.mInput.style.borderColor = '', 1100);
  }

  getNameInputValue() {
    return this.mInput.value.trim();
  }

  // --- Admin Shifts Modal ---
  openAdminModal() {
    this.adminOverlay.classList.add('open');
  }
  closeAdminModal() {
    this.adminOverlay.classList.remove('open');
  }

  renderAdminShiftsList(shiftsTemp, onMove, onRemove) {
    this.adminShiftsList.innerHTML = '';
    shiftsTemp.forEach((s, i) => {
      const div = document.createElement('div');
      div.style.marginBottom = '1rem';
      div.style.padding = '10px';
      div.style.background = 'var(--card)';
      div.style.borderRadius = 'var(--rsm)';
      div.style.position = 'relative';
      
      const isFirst = (i === 0);
      const isLast = (i === shiftsTemp.length - 1);

      div.innerHTML = `
        <div style="position:absolute; top:10px; right:10px; display:flex; gap:4px;">
          <button class="ic-btn" style="background:var(--border); color:#fff; width:24px; height:24px; font-size:12px; ${isFirst ? 'opacity:0.3; cursor:not-allowed;' : ''}" ${isFirst ? 'disabled' : ''}>↑</button>
          <button class="ic-btn" style="background:var(--border); color:#fff; width:24px; height:24px; font-size:12px; ${isLast ? 'opacity:0.3; cursor:not-allowed;' : ''}" ${isLast ? 'disabled' : ''}>↓</button>
          <button class="ic-btn del" style="background:var(--red); color:#fff; width:24px; height:24px; font-size:12px;">✕</button>
        </div>
        <label style="font-size:.8rem; color:var(--cyan); display:block; margin-bottom:5px;">Nombre del Turno</label>
        <input type="text" id="admin-label-${i}" value="${this.esc(s.label)}" placeholder="Ej. Matutino" style="margin-bottom:10px; font-size:.9rem; width:calc(100% - 90px); background:var(--bg); border:1px solid rgba(98,114,164,.4); padding:.4rem; color:var(--fg); border-radius:4px;" />
        <label style="font-size:.8rem; color:var(--cyan); display:block; margin-bottom:5px;">Horas</label>
        <input type="text" id="admin-hours-${i}" value="${this.esc(s.hours)}" placeholder="Ej. 11:00 – 11:20" style="font-size:.9rem; background:var(--bg); border:1px solid rgba(98,114,164,.4); padding:.4rem; color:var(--fg); border-radius:4px;" />
      `;
      
      div.querySelectorAll('button')[0].onclick = () => onMove(i, -1);
      div.querySelectorAll('button')[1].onclick = () => onMove(i, 1);
      div.querySelectorAll('button')[2].onclick = () => onRemove(i);

      this.adminShiftsList.appendChild(div);
    });
  }

  getAdminShiftsInputs(count) {
    const arr = [];
    for(let i=0; i<count; i++) {
      const lbl = document.getElementById('admin-label-'+i)?.value.trim() || '';
      const hrs = document.getElementById('admin-hours-'+i)?.value.trim() || '';
      arr.push({ label: lbl, hours: hrs });
    }
    return arr;
  }

  // --- Admin Categories Modal ---
  openCatModal() {
    this.catOverlay.classList.add('open');
  }
  closeCatModal() {
    this.catOverlay.classList.remove('open');
  }

  renderCatList(catsTemp, onMove, onRemove) {
    this.catList.innerHTML = '';
    catsTemp.forEach((c, i) => {
      const div = document.createElement('div');
      div.style.marginBottom = '1rem';
      div.style.padding = '10px';
      div.style.background = 'var(--card)';
      div.style.borderRadius = 'var(--rsm)';
      div.style.position = 'relative';
      
      const isFirst = (i === 0);
      const isLast = (i === catsTemp.length - 1);

      div.innerHTML = `
        <div style="position:absolute; top:10px; right:10px; display:flex; gap:4px;">
          <button class="ic-btn" style="background:var(--border); color:#fff; width:24px; height:24px; font-size:12px; ${isFirst ? 'opacity:0.3; cursor:not-allowed;' : ''}" ${isFirst ? 'disabled' : ''}>↑</button>
          <button class="ic-btn" style="background:var(--border); color:#fff; width:24px; height:24px; font-size:12px; ${isLast ? 'opacity:0.3; cursor:not-allowed;' : ''}" ${isLast ? 'disabled' : ''}>↓</button>
          <button class="ic-btn del" style="background:var(--red); color:#fff; width:24px; height:24px; font-size:12px;">✕</button>
        </div>
        <label style="font-size:.8rem; color:var(--yellow); display:block; margin-bottom:5px;">Título de Categoría</label>
        <input type="text" id="cat-label-${i}" value="${this.esc(c.title)}" placeholder="Ej. Datos Clínicos" style="margin-bottom:0; font-size:.9rem; width:calc(100% - 90px); background:var(--bg); border:1px solid rgba(98,114,164,.4); padding:.4rem; color:var(--fg); border-radius:4px;" />
      `;
      
      div.querySelectorAll('button')[0].onclick = () => onMove(i, -1);
      div.querySelectorAll('button')[1].onclick = () => onMove(i, 1);
      div.querySelectorAll('button')[2].onclick = () => onRemove(i);

      this.catList.appendChild(div);
    });
  }

  getCatInputs(count) {
    const arr = [];
    for(let i=0; i<count; i++) {
      const title = document.getElementById('cat-label-'+i)?.value.trim() || '';
      arr.push({ title });
    }
    return arr;
  }
}
