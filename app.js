/* ============================================================
   VIVA TIERRA INMOBILIARIA – CRM MVP
   Aplicación completa: Store, MockData, IA (OpenAI), Router, UI
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// 1. CONSTANTES Y CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────
const CONSTANTS = {
    STAGES: ['Nuevo', 'Calificado', 'Reservó', 'Cerrado', 'Sin respuesta', 'Perdido'],
    SOURCES: ['WhatsApp', 'Facebook', 'Instagram', 'Web', 'Referido'],
    STORAGE_KEY: 'viva_tierra_db_v2',
    OPENAI_API_KEY: '', // Se configura desde Settings > Agente IA
    OPENAI_MODEL: 'gpt-3.5-turbo',

    // Nombres reales peruanos para leads mock
    FIRST_NAMES: ['José', 'María', 'Carlos', 'Ana', 'Luis', 'Rosa', 'Miguel', 'Carmen', 'Jorge', 'Patricia',
        'Pedro', 'Lucía', 'Fernando', 'Elena', 'Roberto', 'Silvia', 'Ricardo', 'Claudia', 'Manuel', 'Gabriela',
        'Andrés', 'Teresa', 'Diego', 'Martha', 'Raúl', 'Isabel', 'Héctor', 'Mónica', 'Óscar', 'Laura',
        'Alfredo', 'Roxana', 'Julio', 'Sandra', 'Enrique', 'Pilar', 'Víctor', 'Norma', 'Eduardo', 'Cecilia'],
    LAST_NAMES: ['García', 'Rodríguez', 'Martínez', 'López', 'Gonzales', 'Hernández', 'Pérez', 'Sánchez',
        'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Gutiérrez',
        'Ortiz', 'Ramos', 'Mendoza', 'Castillo', 'Vargas', 'Chávez', 'Rojas', 'Medina', 'Quispe', 'Huamán'],

    // Vendedores iniciales
    DEFAULT_SELLERS: [
        { id: 'v1', name: 'Carlos Ruiz', phone: '51987654321', active: true },
        { id: 'v2', name: 'Ana Gómez', phone: '51912345678', active: true },
        { id: 'v3', name: 'Miguel Torres', phone: '51998765432', active: true },
        { id: 'v4', name: 'Patricia Flores', phone: '51923456789', active: true },
        { id: 'v5', name: 'Roberto Díaz', phone: '51934567890', active: true },
        { id: 'v6', name: 'Lucía Mendoza', phone: '51945678901', active: true }
    ],

    // Mensajes iniciales variados para leads
    INITIAL_MESSAGES: [
        'Hola, vi su anuncio en {source}, quiero información sobre los terrenos.',
        'Buenas, me interesa saber precios y ubicación de los lotes.',
        'Hola buenas tardes, quisiera información sobre terrenos en venta.',
        'Vi su publicidad en {source}. ¿Tienen lotes disponibles?',
        'Buen día, estoy interesado en comprar un terreno. ¿Qué opciones tienen?',
        'Hola, ¿cuánto cuesta el lote más económico?',
        'Me enviaron su contacto, busco un terreno para construir.',
        'Hola, quisiera agendar una visita para ver los terrenos.',
        'Buenas noches, necesito info de precios por favor.',
        'Hola, ¿tienen financiamiento disponible para los lotes?'
    ],

    // Config IA
    AI_SYSTEM_PROMPT: `Eres el asistente virtual de "Viva Tierra Inmobiliaria", una empresa que vende terrenos/lotes en Perú.
Tu ÚNICO objetivo es captar los datos del interesado: nombre completo y correo electrónico.
REGLAS ESTRICTAS:
1. Sé amable, profesional y breve (máximo 2-3 oraciones).
2. NO des precios, ubicaciones ni detalles de los lotes.
3. Si preguntan por precios/detalles, dí que un asesor les dará esa información personalizada.
4. Pide primero el nombre, luego el correo.
5. Si detectas que el mensaje contiene un email, confírmalo.
6. Si detectas que el mensaje es un nombre (1-4 palabras), confírmalo y pide el correo.
7. Si el usuario pide hablar con un humano, di que lo conectarás con un asesor.
8. Responde siempre en español.`
};

// ─────────────────────────────────────────────────────────────
// 2. STORE – Estado Global y Persistencia en localStorage
// ─────────────────────────────────────────────────────────────
const Store = {
    data: {
        leads: [],
        sellers: [],
        currentUser: null,
        settings: {
            aiEnabled: true,
            aiGreeting: '¡Hola! Bienvenido a Viva Tierra Inmobiliaria. Soy tu asistente virtual. Para enviarte información sobre nuestros terrenos, ¿me podrías decir tu nombre?',
            aiScheduleStart: '08:00',
            aiScheduleEnd: '22:00',
            useOpenAI: false // false = simulación local, true = API real
        }
    },

    init() {
        const stored = localStorage.getItem(CONSTANTS.STORAGE_KEY);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
                // Migración: asegurar que sellers exista
                if (!this.data.sellers || !this.data.sellers.length) {
                    this.data.sellers = CONSTANTS.DEFAULT_SELLERS;
                    this.save();
                }
            } catch (e) {
                console.error('Error parseando localStorage, regenerando...', e);
                this.seedData();
            }
        } else {
            this.seedData();
        }
    },

    save() {
        try {
            localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Error guardando en localStorage', e);
        }
        UI.updateBadges();
    },

    // Generador de datos mock completo (200 leads)
    seedData() {
        this.data.sellers = [...CONSTANTS.DEFAULT_SELLERS];
        const leads = [];
        const now = Date.now();
        const dayMs = 86400000;
        const hourMs = 3600000;

        for (let i = 0; i < 200; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const hourOffset = Math.floor(Math.random() * 24);
            const timestamp = now - (daysAgo * dayMs) - (hourOffset * hourMs);

            // Distribución ponderada de etapas
            let stage = 'Nuevo';
            const r = Math.random();
            if (r > 0.85) stage = 'Cerrado';
            else if (r > 0.7) stage = 'Reservó';
            else if (r > 0.55) stage = 'Calificado';
            else if (r > 0.4) stage = 'Sin respuesta';
            else if (r > 0.35) stage = 'Perdido';

            const source = CONSTANTS.SOURCES[Math.floor(Math.random() * CONSTANTS.SOURCES.length)];
            const hasName = stage !== 'Nuevo' || Math.random() > 0.5;
            const firstName = CONSTANTS.FIRST_NAMES[Math.floor(Math.random() * CONSTANTS.FIRST_NAMES.length)];
            const lastName = CONSTANTS.LAST_NAMES[Math.floor(Math.random() * CONSTANTS.LAST_NAMES.length)];
            const fullName = `${firstName} ${lastName}`;

            const phoneNum = `519${(10000000 + Math.floor(Math.random() * 89999999))}`;
            const sellerIdx = Math.floor(Math.random() * this.data.sellers.length);

            const lead = {
                id: 'lead_' + String(i).padStart(3, '0') + '_' + Math.random().toString(36).substr(2, 5),
                fecha_contacto: new Date(timestamp).toISOString().split('T')[0],
                hora_contacto: new Date(timestamp).toTimeString().slice(0, 5),
                cliente_nombre: hasName ? fullName : '',
                email: hasName && Math.random() > 0.3 ? `${firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@${['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'][Math.floor(Math.random() * 4)]}` : '',
                telefono: phoneNum,
                telefono_internacional: phoneNum,
                metodo_entrada: source.toLowerCase().replace(' ', ''),

                // Campos internos CRM
                etapa: stage,
                vendedor_asignado: stage === 'Nuevo' ? 'Sin asignar' : this.data.sellers[sellerIdx].name,
                fuente: source,
                ultima_actividad: timestamp + Math.random() * hourMs,
                tiempo_primera_respuesta: stage !== 'Nuevo' ? Math.floor(Math.random() * 30) + 1 : null,
                tags: this._generateTags(stage, source),
                notas_internas: stage === 'Cerrado' ? 'Cliente cerró compra satisfactoriamente.' : '',
                estado_ia: stage === 'Nuevo' ? 'ON' : 'OFF',
                takeover_por_humano: stage !== 'Nuevo',

                // Chat
                chats: this._generateChatHistory(hasName ? fullName : '', source, stage, timestamp)
            };

            leads.push(lead);
        }

        this.data.leads = leads.sort((a, b) => b.ultima_actividad - a.ultima_actividad);
        this.save();
    },

    _generateTags(stage, source) {
        const tags = [];
        if (source === 'WhatsApp') tags.push('whatsapp');
        if (source === 'Facebook') tags.push('facebook-ads');
        if (stage === 'Cerrado') tags.push('venta-exitosa');
        if (stage === 'Nuevo') tags.push('nuevo-lead');
        if (Math.random() > 0.7) tags.push('urgente');
        return tags;
    },

    _generateChatHistory(name, source, stage, baseTs) {
        const msgs = [];
        const initialMsg = CONSTANTS.INITIAL_MESSAGES[Math.floor(Math.random() * CONSTANTS.INITIAL_MESSAGES.length)]
            .replace('{source}', source);

        msgs.push({ from: 'lead', text: initialMsg, ts: baseTs });

        if (stage === 'Nuevo' && !name) {
            if (Math.random() > 0.5) {
                msgs.push({ from: 'ai', text: '¡Hola! Bienvenido a Viva Tierra. Soy tu asistente virtual. Para enviarte información sobre nuestros terrenos, ¿me podrías decir tu nombre?', ts: baseTs + 5000 });
            }
            return msgs;
        }

        if (stage === 'Nuevo' && name) {
            msgs.push({ from: 'ai', text: '¡Hola! Bienvenido a Viva Tierra. Para enviarte la info completa, ¿me dices tu nombre?', ts: baseTs + 5000 });
            msgs.push({ from: 'lead', text: name, ts: baseTs + 60000 });
            msgs.push({ from: 'ai', text: `Mucho gusto, ${name}. ¿Me brindas tu correo electrónico para enviarte el brochure?`, ts: baseTs + 65000 });
            return msgs;
        }

        // Leads avanzados tienen más historial
        msgs.push({ from: 'ai', text: '¡Hola! Soy el asistente de Viva Tierra. ¿Me dices tu nombre?', ts: baseTs + 3000 });
        msgs.push({ from: 'lead', text: name || 'Mi nombre es Juan', ts: baseTs + 60000 });
        msgs.push({ from: 'ai', text: `Gracias, ${name || 'Juan'}. ¿Tu correo electrónico?`, ts: baseTs + 65000 });
        msgs.push({ from: 'lead', text: 'claro, es mi_correo@gmail.com', ts: baseTs + 120000 });
        msgs.push({ from: 'human', text: `Hola ${name || ''}, soy tu asesor. Te comento sobre nuestros lotes disponibles...`, ts: baseTs + 180000 });

        if (stage === 'Calificado' || stage === 'Reservó' || stage === 'Cerrado') {
            msgs.push({ from: 'lead', text: '¿Cuánto cuesta el lote de 200m²?', ts: baseTs + 240000 });
            msgs.push({ from: 'human', text: 'Ese lote tiene un precio especial de lanzamiento. Te envío la ficha técnica.', ts: baseTs + 300000 });
        }
        if (stage === 'Reservó' || stage === 'Cerrado') {
            msgs.push({ from: 'lead', text: 'Me interesa, ¿cómo separo?', ts: baseTs + 360000 });
            msgs.push({ from: 'human', text: 'Con un adelanto de S/1,000 lo separas. Te paso los datos de la cuenta.', ts: baseTs + 420000 });
        }
        if (stage === 'Cerrado') {
            msgs.push({ from: 'lead', text: 'Listo, ya hice la transferencia.', ts: baseTs + 480000 });
            msgs.push({ from: 'human', text: '¡Excelente! Confirmamos tu compra. Bienvenido a Viva Tierra. 🎉', ts: baseTs + 540000 });
        }

        return msgs;
    },

    // ── Métodos CRUD ──
    getLeadById(id) {
        return this.data.leads.find(l => l.id === id);
    },

    updateLead(id, updates) {
        const idx = this.data.leads.findIndex(l => l.id === id);
        if (idx !== -1) {
            this.data.leads[idx] = { ...this.data.leads[idx], ...updates, ultima_actividad: Date.now() };
            this.save();
            return this.data.leads[idx];
        }
        return null;
    },

    addMessage(id, msg) {
        const lead = this.getLeadById(id);
        if (lead) {
            lead.chats.push(msg);
            lead.ultima_actividad = Date.now();
            this.data.leads.sort((a, b) => b.ultima_actividad - a.ultima_actividad);
            this.save();
        }
    },

    // ── Métricas ──
    getMetrics() {
        const now = Date.now();
        const dayMs = 86400000;
        const weekMs = dayMs * 7;
        const leads = this.data.leads;

        const leadsToday = leads.filter(l => (now - new Date(l.fecha_contacto).getTime()) < dayMs);
        const leadsWeek = leads.filter(l => (now - new Date(l.fecha_contacto).getTime()) < weekMs);

        const responseTimes = leads.filter(l => l.tiempo_primera_respuesta !== null).map(l => l.tiempo_primera_respuesta);
        const avgResponseTime = responseTimes.length ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : 'N/A';

        return {
            total: leads.length,
            today: leadsToday.length,
            week: leadsWeek.length,
            avgResponseTime,
            byStage: CONSTANTS.STAGES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.etapa === s).length }), {}),
            bySource: CONSTANTS.SOURCES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.fuente === s).length }), {}),
            bySeller: this.data.sellers.reduce((acc, seller) => {
                const sellerLeads = leads.filter(l => l.vendedor_asignado === seller.name);
                acc[seller.name] = {
                    total: sellerLeads.length,
                    nuevo: sellerLeads.filter(l => l.etapa === 'Nuevo').length,
                    calificado: sellerLeads.filter(l => l.etapa === 'Calificado').length,
                    reservo: sellerLeads.filter(l => l.etapa === 'Reservó').length,
                    cerrado: sellerLeads.filter(l => l.etapa === 'Cerrado').length,
                    avgResponse: (() => {
                        const times = sellerLeads.filter(l => l.tiempo_primera_respuesta).map(l => l.tiempo_primera_respuesta);
                        return times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0) : '-';
                    })()
                };
                return acc;
            }, {}),
            conversionRate: leads.length ? ((leads.filter(l => l.etapa === 'Cerrado').length / leads.length) * 100).toFixed(1) : '0'
        };
    },

    // ── Vendedores CRUD ──
    addSeller(seller) {
        seller.id = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        seller.active = true;
        this.data.sellers.push(seller);
        this.save();
        return seller;
    },

    updateSeller(id, updates) {
        const idx = this.data.sellers.findIndex(s => s.id === id);
        if (idx !== -1) {
            this.data.sellers[idx] = { ...this.data.sellers[idx], ...updates };
            this.save();
        }
    },

    deleteSeller(id) {
        const seller = this.data.sellers.find(s => s.id === id);
        if (seller) {
            this.data.leads.forEach(l => {
                if (l.vendedor_asignado === seller.name) {
                    l.vendedor_asignado = 'Sin asignar';
                }
            });
            this.data.sellers = this.data.sellers.filter(s => s.id !== id);
            this.save();
        }
    },

    getActiveSellers() {
        return this.data.sellers.filter(s => s.active);
    },

    // ── Auto-asignación (round-robin) ──
    autoAssignIndex: 0,
    autoAssign(leadId) {
        const activeSellers = this.getActiveSellers();
        if (!activeSellers.length) return;
        const seller = activeSellers[this.autoAssignIndex % activeSellers.length];
        this.autoAssignIndex++;
        this.updateLead(leadId, { vendedor_asignado: seller.name });
        return seller.name;
    },

    autoAssignAll() {
        const unassigned = this.data.leads.filter(l => l.vendedor_asignado === 'Sin asignar');
        const sellers = this.getActiveSellers();
        if (!sellers.length) return 0;
        unassigned.forEach((lead, i) => {
            lead.vendedor_asignado = sellers[i % sellers.length].name;
            lead.ultima_actividad = Date.now();
        });
        this.save();
        return unassigned.length;
    }
};

// ─────────────────────────────────────────────────────────────
// 3. AGENTE IA – Modo local + OpenAI real
// ─────────────────────────────────────────────────────────────
const AI_Agent = {
    processingLeads: new Set(),

    checkAndRespond(lead) {
        if (lead.etapa !== 'Nuevo' || lead.takeover_por_humano) return;
        if (lead.estado_ia === 'OFF') return;
        if (this.processingLeads.has(lead.id)) return;

        const lastMsg = lead.chats[lead.chats.length - 1];
        if (!lastMsg || lastMsg.from !== 'lead') return;

        // Triggers de handoff inmediato
        const lower = lastMsg.text.toLowerCase();
        if (lower.includes('hablar con alguien') || lower.includes('persona real') ||
            lower.includes('asesor') || lower.includes('humano') || lower.includes('queja') ||
            lower.includes('reclamo') || lower.includes('problema')) {
            Store.updateLead(lead.id, {
                takeover_por_humano: true,
                estado_ia: 'OFF',
                tags: [...(lead.tags || []), 'requiere-humano']
            });
            Store.addMessage(lead.id, {
                from: 'ai',
                text: 'Entiendo, te conecto ahora mismo con un asesor humano. Un momento por favor.',
                ts: Date.now()
            });
            this._refreshUI(lead.id);
            return;
        }

        this.processingLeads.add(lead.id);

        setTimeout(async () => {
            try {
                let reply;
                if (Store.data.settings.useOpenAI) {
                    reply = await this.callOpenAI(lead, lastMsg.text);
                } else {
                    reply = this.generateLocalResponse(lead, lastMsg.text);
                }

                this._extractDataFromMessage(lead, lastMsg.text);
                Store.addMessage(lead.id, { from: 'ai', text: reply, ts: Date.now() });
                this._refreshUI(lead.id);
            } catch (err) {
                console.error('Error IA:', err);
                const reply = this.generateLocalResponse(lead, lastMsg.text);
                this._extractDataFromMessage(lead, lastMsg.text);
                Store.addMessage(lead.id, { from: 'ai', text: reply, ts: Date.now() });
                this._refreshUI(lead.id);
            } finally {
                this.processingLeads.delete(lead.id);
            }
        }, 1500 + Math.random() * 1500);
    },

    async callOpenAI(lead, userMessage) {
        const messages = [
            { role: 'system', content: CONSTANTS.AI_SYSTEM_PROMPT },
            { role: 'system', content: `Datos actuales del lead: Nombre: "${lead.cliente_nombre || 'Desconocido'}", Email: "${lead.email || 'No proporcionado'}". Pide los datos que falten.` }
        ];

        const recentChats = lead.chats.slice(-6);
        recentChats.forEach(m => {
            if (m.from === 'lead') messages.push({ role: 'user', content: m.text });
            else if (m.from === 'ai') messages.push({ role: 'assistant', content: m.text });
        });

        if (!recentChats.length || recentChats[recentChats.length - 1].text !== userMessage) {
            messages.push({ role: 'user', content: userMessage });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONSTANTS.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: CONSTANTS.OPENAI_MODEL,
                messages: messages,
                max_tokens: 150,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    },

    generateLocalResponse(lead, text) {
        const lower = text.toLowerCase();
        const emailRegex = /\b[\w\.\-]+@[\w\.\-]+\.\w{2,6}\b/;
        const hasEmail = emailRegex.test(text);

        if (hasEmail) {
            const email = text.match(emailRegex)[0];
            Store.updateLead(lead.id, { email: email });

            if (lead.cliente_nombre) {
                Store.updateLead(lead.id, {
                    etapa: 'Calificado',
                    takeover_por_humano: true,
                    estado_ia: 'OFF'
                });
                return `¡Perfecto, ${lead.cliente_nombre}! Ya registré tu correo (${email}). Un asesor especializado te contactará en breve con toda la información de precios y disponibilidad. ¡Gracias por tu interés en Viva Tierra! 🏡`;
            }
            return '¡Gracias por el correo! Solo me falta tu nombre completo para el registro. ¿Me lo compartes?';
        }

        const noKeywords = !lower.includes('hola') && !lower.includes('precio') && !lower.includes('cuánto') &&
            !lower.includes('terreno') && !lower.includes('lote') && !lower.includes('información') &&
            !lower.includes('info') && !lower.includes('buenas') && !lower.includes('disponible');

        if (!lead.cliente_nombre && text.split(' ').length <= 4 && text.split(' ').length >= 1 && noKeywords && text.length > 2) {
            const cleanName = text.replace(/^(soy|me llamo|mi nombre es)\s*/i, '').trim();
            if (cleanName.length > 2) {
                Store.updateLead(lead.id, { cliente_nombre: cleanName });
                return `¡Mucho gusto, ${cleanName}! 😊 Para enviarte el brochure con precios y el mapa de lotes disponibles, ¿me podrías brindar tu correo electrónico?`;
            }
        }

        if (!lead.cliente_nombre) {
            return '¡Hola! Bienvenido a Viva Tierra Inmobiliaria 🏡. Soy tu asistente virtual. Para darte información sobre precios y disponibilidad de nuestros terrenos, ¿me podrías decir tu nombre completo?';
        }
        if (!lead.email) {
            return `Hola ${lead.cliente_nombre}, ¿me podrías brindar tu correo electrónico? Así te envío toda la información con precios, planos y opciones de financiamiento.`;
        }

        Store.updateLead(lead.id, { takeover_por_humano: true, estado_ia: 'OFF' });
        return 'Entiendo tu consulta. Voy a conectarte con un asesor humano especializado para resolver eso. Un momento por favor. 🙏';
    },

    _extractDataFromMessage(lead, text) {
        const emailRegex = /\b[\w\.\-]+@[\w\.\-]+\.\w{2,6}\b/;
        if (emailRegex.test(text)) {
            const email = text.match(emailRegex)[0];
            Store.updateLead(lead.id, { email });

            if (lead.cliente_nombre) {
                Store.updateLead(lead.id, {
                    etapa: 'Calificado',
                    takeover_por_humano: true,
                    estado_ia: 'OFF'
                });
            }
        }
    },

    _refreshUI(leadId) {
        const lead = Store.getLeadById(leadId);
        if (!lead) return;
        if (window.currentChatId === leadId) UI.renderChatWindow(lead);
        if (Router.currentRoute === 'inbox') UI.renderInboxList();
        UI.updateBadges();
    }
};

// ─────────────────────────────────────────────────────────────
// 4. ROUTER – Navegación hash-based
// ─────────────────────────────────────────────────────────────
const Router = {
    currentRoute: 'dashboard',

    navigate(route) {
        this.currentRoute = route;
        window.currentChatId = null;

        // Cerrar sidebar móvil al navegar
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobile-sidebar-backdrop');
        if (sidebar && backdrop && window.innerWidth < 768) {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
            backdrop.classList.add('hidden');
        }

        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('bg-orange-50', 'text-brand-orange');
            el.classList.add('text-gray-600');
        });
        const nav = document.getElementById(`nav-${route}`);
        if (nav) {
            nav.classList.add('bg-orange-50', 'text-brand-orange');
            nav.classList.remove('text-gray-600');
        }

        document.querySelectorAll('.nav-mobile').forEach(el => el.classList.remove('text-brand-orange'));
        const mobileNav = document.querySelector(`.nav-mobile[data-target="${route}"]`);
        if (mobileNav) mobileNav.classList.add('text-brand-orange');

        const container = document.getElementById('main-view');
        container.innerHTML = '';

        const titles = { dashboard: 'Métricas', inbox: 'Bandeja', pipeline: 'Embudo', settings: 'Config' };
        const titleEl = document.getElementById('mobile-page-title');
        if (titleEl) titleEl.innerText = titles[route] || route;

        const mobileNavBar = document.querySelector('body > #app-layout > main > nav');
        if (mobileNavBar) mobileNavBar.classList.remove('hidden');

        switch (route) {
            case 'dashboard': UI.renderDashboard(container); break;
            case 'inbox': UI.renderInbox(container); break;
            case 'pipeline': UI.renderPipeline(container); break;
            case 'settings': UI.renderSettings(container); break;
        }

        window.location.hash = '#/' + route;
    },

    handleHash() {
        const hash = window.location.hash.replace('#/', '') || 'dashboard';
        const validRoutes = ['dashboard', 'inbox', 'pipeline', 'settings'];
        if (validRoutes.includes(hash)) {
            this.navigate(hash);
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 5. UI RENDERER – Renderizado de todas las vistas
// ─────────────────────────────────────────────────────────────
const UI = {
    currentFilter: 'all',
    searchQuery: '',

    playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.1;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) { /* silenciar */ }
    },

    updateBadges() {
        const count = Store.data.leads.filter(l => l.etapa === 'Nuevo' || l.etapa === 'Sin respuesta').length;
        ['badge-inbox', 'mobile-badge-inbox'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (count > 0) {
                el.innerText = count > 99 ? '99+' : count;
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
    },

    getStageChipClass(stage) {
        const map = {
            'Nuevo': 'chip-nuevo', 'Calificado': 'chip-calificado', 'Reservó': 'chip-reservo',
            'Cerrado': 'chip-cerrado', 'Sin respuesta': 'chip-sin-respuesta', 'Perdido': 'chip-perdido'
        };
        return map[stage] || 'chip-nuevo';
    },

    getSourceIcon(source) {
        const map = {
            'WhatsApp': 'ph-whatsapp-logo text-green-500',
            'Facebook': 'ph-facebook-logo text-blue-600',
            'Instagram': 'ph-instagram-logo text-pink-500',
            'Web': 'ph-globe text-blue-400',
            'Referido': 'ph-users text-amber-500'
        };
        return map[source] || 'ph-globe';
    },

    timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    },

    showModal(title, bodyHtml, footerHtml = '') {
        const existing = document.getElementById('app-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'app-modal';
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center p-5 border-b border-gray-100">
                    <h3 class="font-bold text-lg text-gray-800">${title}</h3>
                    <button onclick="document.getElementById('app-modal').remove()" class="text-gray-400 hover:text-gray-600 p-1">
                        <i class="ph-bold ph-x text-xl"></i>
                    </button>
                </div>
                <div class="p-5">${bodyHtml}</div>
                ${footerHtml ? `<div class="p-5 border-t border-gray-100 flex justify-end gap-3">${footerHtml}</div>` : ''}
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeModal() {
        const modal = document.getElementById('app-modal');
        if (modal) modal.remove();
    },

    // ══════════════════════════════════════════════════════
    // VISTA: DASHBOARD
    // ══════════════════════════════════════════════════════
    renderDashboard(container) {
        const m = Store.getMetrics();

        const bar = (label, val, max, color = 'bg-brand-orange') => {
            const pct = max > 0 ? Math.round((val / max) * 100) : 0;
            return `
                <div class="mb-3">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="font-medium text-gray-600">${label}</span>
                        <span class="text-gray-500 font-semibold">${val}</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div class="${color} h-full rounded-full progress-bar-animated" style="width: ${pct}%"></div>
                    </div>
                </div>`;
        };

        container.innerHTML = `
            <div class="p-4 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto page-transition pb-24 md:pb-8 custom-scrollbar">
                <div class="mb-6">
                    <h2 class="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h2>
                    <p class="text-sm text-gray-500">Resumen general de tu embudo de ventas</p>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-orange">
                        <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Leads Totales</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">${m.total}</p>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Hoy</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">${m.today}</p>
                        <p class="text-[10px] text-gray-400">7d: ${m.week}</p>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                        <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ventas</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">${m.byStage['Cerrado'] || 0}</p>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
                        <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Resp. Prom.</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">${m.avgResponseTime}<span class="text-sm text-gray-400">min</span></p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white p-5 md:p-6 rounded-xl shadow-sm">
                        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i class="ph-bold ph-funnel text-brand-orange"></i> Embudo Actual
                        </h3>
                        ${CONSTANTS.STAGES.map(s =>
                bar(s, m.byStage[s] || 0, m.total, s === 'Cerrado' ? 'bg-green-500' : s === 'Perdido' ? 'bg-gray-400' : 'bg-brand-orange')
            ).join('')}
                    </div>

                    <div class="bg-white p-5 md:p-6 rounded-xl shadow-sm">
                        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i class="ph-bold ph-globe text-blue-500"></i> Fuentes de Tráfico
                        </h3>
                        ${Object.keys(m.bySource).map(s =>
                bar(s, m.bySource[s], m.total, 'bg-blue-500')
            ).join('')}
                    </div>

                    <div class="bg-white p-5 md:p-6 rounded-xl shadow-sm md:col-span-2">
                        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i class="ph-bold ph-trophy text-amber-500"></i> Ranking de Vendedores
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                                        <th class="py-2 pr-4">Vendedor</th>
                                        <th class="py-2 px-2 text-center">Total</th>
                                        <th class="py-2 px-2 text-center hidden md:table-cell">Calificados</th>
                                        <th class="py-2 px-2 text-center hidden md:table-cell">Reservas</th>
                                        <th class="py-2 px-2 text-center">Ventas</th>
                                        <th class="py-2 px-2 text-center hidden md:table-cell">Resp. Prom.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(m.bySeller)
                .sort((a, b) => b[1].cerrado - a[1].cerrado)
                .map(([name, stats], i) => `
                                        <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
                                            <td class="py-3 pr-4 flex items-center gap-2">
                                                <span class="w-6 h-6 rounded-full ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'} flex items-center justify-center text-xs font-bold">${i + 1}</span>
                                                <span class="font-medium">${name}</span>
                                            </td>
                                            <td class="py-3 px-2 text-center font-bold">${stats.total}</td>
                                            <td class="py-3 px-2 text-center hidden md:table-cell">${stats.calificado}</td>
                                            <td class="py-3 px-2 text-center hidden md:table-cell">${stats.reservo}</td>
                                            <td class="py-3 px-2 text-center"><span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">${stats.cerrado}</span></td>
                                            <td class="py-3 px-2 text-center hidden md:table-cell text-gray-500">${stats.avgResponse}min</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="bg-white p-5 md:p-6 rounded-xl shadow-sm md:col-span-2">
                        <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i class="ph-bold ph-chart-line-up text-green-500"></i> Conversión del Embudo
                        </h3>
                        <div class="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                            ${(() => {
                const stages = ['Nuevo', 'Calificado', 'Reservó', 'Cerrado'];
                return stages.map((s, i) => {
                    const val = m.byStage[s] || 0;
                    const prev = i > 0 ? (m.byStage[stages[i - 1]] || 1) : m.total;
                    const pct = prev > 0 ? ((val / prev) * 100).toFixed(0) : 0;
                    return `
                                    <div class="text-center">
                                        <div class="text-2xl font-bold text-gray-800">${val}</div>
                                        <div class="text-xs text-gray-500">${s}</div>
                                    </div>
                                    ${i < stages.length - 1 ? `<div class="text-brand-orange font-bold text-sm">→ ${pct}%</div>` : ''}
                                `;
                }).join('');
            })()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ══════════════════════════════════════════════════════
    // VISTA: INBOX
    // ══════════════════════════════════════════════════════
    renderInbox(container) {
        container.innerHTML = `
            <div class="flex h-full w-full page-transition">
                <div id="inbox-list" class="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
                    <div class="p-3 md:p-4 border-b border-gray-100 space-y-3">
                        <input type="text" id="inbox-search" placeholder="🔍 Buscar por nombre, teléfono o email..."
                               oninput="UI.filterInboxSearch(this.value)"
                               class="w-full bg-gray-100 border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-orange outline-none">
                        <div class="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            <button onclick="UI.setFilter('all')" data-filter="all"
                                class="inbox-filter-btn px-3 py-1.5 rounded-full text-[11px] font-semibold bg-brand-orange text-white transition whitespace-nowrap">Todos</button>
                            <button onclick="UI.setFilter('Nuevo')" data-filter="Nuevo"
                                class="inbox-filter-btn px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 transition whitespace-nowrap">🤖 Nuevos</button>
                            <button onclick="UI.setFilter('Calificado')" data-filter="Calificado"
                                class="inbox-filter-btn px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 transition whitespace-nowrap">Calificados</button>
                            <button onclick="UI.setFilter('Sin respuesta')" data-filter="Sin respuesta"
                                class="inbox-filter-btn px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 transition whitespace-nowrap">⚠ Sin resp.</button>
                            <button onclick="UI.setFilter('Cerrado')" data-filter="Cerrado"
                                class="inbox-filter-btn px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 transition whitespace-nowrap">✅ Ventas</button>
                        </div>
                    </div>
                    <div id="chat-list-items" class="flex-1 overflow-y-auto custom-scrollbar"></div>
                </div>

                <div id="chat-window" class="hidden md:flex flex-1 flex-col bg-gray-50 h-full relative z-10">
                    <div class="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <i class="ph-duotone ph-chats-teardrop text-7xl mb-4 text-brand-orange"></i>
                        <p class="font-medium text-lg">Selecciona una conversación</p>
                        <p class="text-sm mt-1">Elige un chat de la lista para comenzar</p>
                    </div>
                </div>
            </div>
        `;
        this.renderInboxList();
    },

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.inbox-filter-btn').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.remove('bg-gray-100', 'text-gray-600');
                btn.classList.add('bg-brand-orange', 'text-white');
            } else {
                btn.classList.remove('bg-brand-orange', 'text-white');
                btn.classList.add('bg-gray-100', 'text-gray-600');
            }
        });
        this.renderInboxList();
    },

    filterInboxSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderInboxList();
    },

    renderInboxList() {
        const listEl = document.getElementById('chat-list-items');
        if (!listEl) return;

        let leads = [...Store.data.leads];

        if (this.currentFilter !== 'all') {
            leads = leads.filter(l => l.etapa === this.currentFilter);
        }

        if (this.searchQuery) {
            leads = leads.filter(l =>
                (l.cliente_nombre || '').toLowerCase().includes(this.searchQuery) ||
                (l.telefono || '').includes(this.searchQuery) ||
                (l.email || '').toLowerCase().includes(this.searchQuery)
            );
        }

        if (!leads.length) {
            listEl.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                    <i class="ph-duotone ph-magnifying-glass text-4xl mb-3"></i>
                    <p class="font-medium">No se encontraron resultados</p>
                    <p class="text-xs mt-1">Intenta con otro filtro o búsqueda</p>
                </div>`;
            return;
        }

        listEl.innerHTML = leads.map(l => {
            const lastMsg = l.chats[l.chats.length - 1];
            const isActive = window.currentChatId === l.id;
            const isAi = l.etapa === 'Nuevo' && !l.takeover_por_humano && l.estado_ia === 'ON';
            const displayName = l.cliente_nombre || l.telefono || 'Sin identificar';

            let statusIcon = '';
            if (isAi) statusIcon = '<i class="ph-fill ph-robot text-purple-500 text-sm"></i>';
            else if (l.etapa === 'Cerrado') statusIcon = '<i class="ph-fill ph-check-circle text-green-500 text-sm"></i>';
            else if (l.etapa === 'Sin respuesta') statusIcon = '<i class="ph-fill ph-warning text-red-500 text-sm"></i>';

            const lastMsgPrefix = lastMsg ? (lastMsg.from === 'human' ? 'Tú: ' : lastMsg.from === 'ai' ? '🤖 ' : '') : '';
            const lastMsgText = lastMsg ? lastMsg.text : '';

            return `
                <div onclick="UI.openChat('${l.id}')"
                     class="p-3.5 border-b border-gray-100 cursor-pointer hover:bg-orange-50 transition ${isActive ? 'bg-orange-50 border-l-4 border-l-brand-orange' : ''}">
                    <div class="flex justify-between items-start mb-1">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            <div class="w-9 h-9 rounded-full ${isAi ? 'bg-purple-100' : 'bg-gray-200'} flex items-center justify-center text-xs font-bold ${isAi ? 'text-purple-600' : 'text-gray-500'} shrink-0">
                                ${displayName.charAt(0).toUpperCase()}
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="font-semibold text-gray-800 text-sm truncate">${displayName}</h4>
                                <p class="text-[11px] text-gray-400 truncate">${lastMsgPrefix}${lastMsgText}</p>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0 ml-2">
                            <span class="text-[10px] text-gray-400">${this.timeAgo(l.ultima_actividad)}</span>
                            ${statusIcon}
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 mt-1.5 ml-11">
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium ${this.getStageChipClass(l.etapa)}">${l.etapa}</span>
                        <span class="text-[10px] text-gray-400 flex items-center gap-0.5"><i class="ph-fill ${this.getSourceIcon(l.fuente)} text-[10px]"></i>${l.fuente}</span>
                        ${l.vendedor_asignado !== 'Sin asignar' ? `<span class="text-[10px] text-gray-400">• ${l.vendedor_asignado.split(' ')[0]}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    },

    openChat(id) {
        window.currentChatId = id;
        const lead = Store.getLeadById(id);
        if (!lead) return;

        if (window.innerWidth < 768) {
            document.getElementById('inbox-list').classList.add('hidden');
            const win = document.getElementById('chat-window');
            win.classList.remove('hidden');
            win.classList.add('flex', 'absolute', 'inset-0');
            const mobileNav = document.querySelector('#app-layout > main > nav');
            if (mobileNav) mobileNav.classList.add('hidden');
        } else {
            document.getElementById('chat-window').classList.remove('hidden');
            document.getElementById('chat-window').classList.add('flex');
        }

        this.renderInboxList();
        this.renderChatWindow(lead);
    },

    backToInbox() {
        window.currentChatId = null;
        const inboxList = document.getElementById('inbox-list');
        const chatWin = document.getElementById('chat-window');
        if (inboxList) inboxList.classList.remove('hidden');
        if (chatWin) {
            chatWin.classList.add('hidden');
            chatWin.classList.remove('absolute', 'inset-0', 'flex');
        }
        const mobileNav = document.querySelector('#app-layout > main > nav');
        if (mobileNav) mobileNav.classList.remove('hidden');
        this.renderInboxList();
    },

    renderChatWindow(lead) {
        const win = document.getElementById('chat-window');
        if (!win) return;
        const isAi = lead.etapa === 'Nuevo' && !lead.takeover_por_humano && lead.estado_ia === 'ON';
        const displayName = lead.cliente_nombre || lead.telefono || 'Sin identificar';
        const sellers = Store.getActiveSellers();

        win.innerHTML = `
            <div class="bg-white border-b border-gray-200 px-4 py-3 shadow-sm shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 min-w-0">
                        <button onclick="UI.backToInbox()" class="md:hidden text-gray-500 p-1 hover:bg-gray-100 rounded-lg">
                            <i class="ph-bold ph-arrow-left text-xl"></i>
                        </button>
                        <div class="w-10 h-10 rounded-full ${isAi ? 'bg-purple-100' : 'bg-gray-200'} flex items-center justify-center text-brand-orange font-bold text-sm shrink-0">
                            ${displayName.charAt(0).toUpperCase()}
                        </div>
                        <div class="min-w-0">
                            <h3 class="font-bold text-sm text-gray-800 truncate">${displayName}</h3>
                            <p class="text-[11px] text-gray-500 flex items-center gap-1 flex-wrap">
                                <i class="ph-fill ${this.getSourceIcon(lead.fuente)}"></i> ${lead.fuente}
                                • <span class="font-medium">${lead.telefono}</span>
                                ${isAi ? ' • <span class="text-purple-600 font-bold pulse-dot">● IA Activa</span>' : ''}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="UI.showLeadDetails('${lead.id}')" class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg tooltip" data-tooltip="Info del lead">
                            <i class="ph ph-info text-lg"></i>
                        </button>
                        <button onclick="UI.showNotesModal('${lead.id}')" class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg tooltip" data-tooltip="Notas">
                            <i class="ph ph-note-pencil text-lg"></i>
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-2 flex-wrap">
                    <select onchange="UI.changeStage('${lead.id}', this.value)"
                            class="bg-gray-100 text-xs border-none rounded-lg py-1.5 px-2 font-medium focus:ring-1 focus:ring-brand-orange cursor-pointer">
                        ${CONSTANTS.STAGES.map(s => `<option value="${s}" ${lead.etapa === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <select onchange="UI.assignSeller('${lead.id}', this.value)"
                            class="bg-gray-100 text-xs border-none rounded-lg py-1.5 px-2 font-medium focus:ring-1 focus:ring-brand-orange cursor-pointer">
                        <option value="Sin asignar" ${lead.vendedor_asignado === 'Sin asignar' ? 'selected' : ''}>Sin asignar</option>
                        ${sellers.map(s => `<option value="${s.name}" ${lead.vendedor_asignado === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                    ${isAi ? `
                        <button onclick="UI.takeoverChat('${lead.id}')"
                                class="bg-red-50 text-red-600 text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition flex items-center gap-1">
                            <i class="ph-bold ph-hand text-xs"></i> Tomar control
                        </button>
                    ` : ''}
                    ${!isAi && lead.etapa === 'Nuevo' && !lead.takeover_por_humano ? `
                        <button onclick="UI.reactivateAI('${lead.id}')"
                                class="bg-purple-50 text-purple-600 text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-100 transition flex items-center gap-1">
                            <i class="ph-bold ph-robot text-xs"></i> Reactivar IA
                        </button>
                    ` : ''}
                </div>
            </div>

            <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 custom-scrollbar">
                ${lead.chats.map(m => {
            const isLead = m.from === 'lead';
            const isAiMsg = m.from === 'ai';
            const isSystem = m.from === 'system';
            const bubbleClass = isLead ? 'bubble-lead' : isAiMsg ? 'bubble-ai' : isSystem ? 'bubble-system' : 'bubble-me';
            const align = isLead || isAiMsg ? 'justify-start' : isSystem ? 'justify-center' : 'justify-end';
            return `
                    <div class="flex w-full ${align}">
                        <div class="max-w-[85%] text-sm p-3 shadow-sm ${bubbleClass}">
                            ${isAiMsg ? '<p class="text-[10px] font-bold mb-1 flex items-center gap-1 opacity-70"><i class="ph-bold ph-robot"></i> Asistente IA</p>' : ''}
                            ${m.text}
                            <p class="text-[9px] opacity-50 text-right mt-1">${new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>`;
        }).join('')}
            </div>

            <div class="p-3 bg-white border-t border-gray-200 shrink-0 pb-safe">
                ${isAi ? `
                    <div class="mb-2 bg-purple-50 border border-purple-200 text-purple-700 text-xs p-2.5 rounded-lg flex justify-between items-center">
                        <span class="flex items-center gap-1.5">
                            <i class="ph-bold ph-robot"></i>
                            <span>La IA está respondiendo automáticamente. Escribir desactivará la IA.</span>
                        </span>
                        <button onclick="UI.takeoverChat('${lead.id}')" class="font-bold underline ml-2 whitespace-nowrap">Tomar Control</button>
                    </div>` : ''}
                <div class="flex gap-2 items-center">
                    <input type="text" id="chat-input"
                           class="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                           placeholder="Escribe un mensaje..."
                           onkeypress="if(event.key==='Enter') UI.sendFromInput('${lead.id}')">
                    <button onclick="UI.sendFromInput('${lead.id}')"
                            class="bg-brand-orange text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:bg-brand-dark transition transform active:scale-95 shrink-0">
                        <i class="ph-fill ph-paper-plane-right"></i>
                    </button>
                </div>
            </div>
        `;

        setTimeout(() => {
            const el = document.getElementById('messages-container');
            if (el) el.scrollTop = el.scrollHeight;
        }, 50);
    },

    sendFromInput(id) {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;
        this.sendMessage(id, input.value.trim());
        input.value = '';
    },

    sendMessage(id, text) {
        Store.addMessage(id, { from: 'human', text, ts: Date.now() });
        Store.updateLead(id, { takeover_por_humano: true, estado_ia: 'OFF' });
        const lead = Store.getLeadById(id);
        if (lead && lead.tiempo_primera_respuesta === null) {
            const diffMin = Math.floor((Date.now() - new Date(lead.fecha_contacto).getTime()) / 60000);
            Store.updateLead(id, { tiempo_primera_respuesta: diffMin });
        }
        this.renderChatWindow(Store.getLeadById(id));
        this.renderInboxList();
    },

    takeoverChat(id) {
        Store.updateLead(id, { takeover_por_humano: true, estado_ia: 'OFF' });
        Store.addMessage(id, { from: 'system', text: '🔔 Un asesor humano ha tomado el control de esta conversación.', ts: Date.now() });
        this.renderChatWindow(Store.getLeadById(id));
        this.renderInboxList();
    },

    reactivateAI(id) {
        const lead = Store.getLeadById(id);
        if (lead && lead.etapa === 'Nuevo' && !lead.takeover_por_humano) {
            Store.updateLead(id, { estado_ia: 'ON' });
            this.renderChatWindow(Store.getLeadById(id));
        }
    },

    assignSeller(id, sellerName) {
        Store.updateLead(id, { vendedor_asignado: sellerName });
        this.renderChatWindow(Store.getLeadById(id));
        this.renderInboxList();
    },

    changeStage(id, stage) {
        if (stage === 'Cerrado') {
            this.showModal(
                '¿Confirmar venta cerrada?',
                '<p class="text-gray-600 text-sm">Esto moverá el lead a métricas de éxito. Esta acción se puede revertir cambiando la etapa.</p>',
                `<button onclick="UI.closeModal()" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                 <button onclick="UI._confirmStageChange('${id}', '${stage}')" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">Confirmar Venta</button>`
            );
            return;
        }
        this._confirmStageChange(id, stage);
    },

    _confirmStageChange(id, stage) {
        this.closeModal();
        Store.updateLead(id, { etapa: stage });
        if (stage !== 'Nuevo') {
            Store.updateLead(id, { estado_ia: 'OFF', takeover_por_humano: true });
        }
        this.updateBadges();
        const lead = Store.getLeadById(id);
        if (lead && window.currentChatId === id) this.renderChatWindow(lead);
        this.renderInboxList();
    },

    showLeadDetails(id) {
        const lead = Store.getLeadById(id);
        if (!lead) return;

        this.showModal('Detalles del Lead', `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Nombre</label>
                        <p class="text-sm font-medium text-gray-800">${lead.cliente_nombre || 'No registrado'}</p>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Email</label>
                        <p class="text-sm font-medium text-gray-800">${lead.email || 'No registrado'}</p>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Teléfono</label>
                        <p class="text-sm font-medium text-gray-800">${lead.telefono}</p>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Fuente</label>
                        <p class="text-sm font-medium text-gray-800 flex items-center gap-1"><i class="ph-fill ${this.getSourceIcon(lead.fuente)}"></i> ${lead.fuente}</p>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Fecha contacto</label>
                        <p class="text-sm font-medium text-gray-800">${lead.fecha_contacto} ${lead.hora_contacto}</p>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Vendedor</label>
                        <p class="text-sm font-medium text-gray-800">${lead.vendedor_asignado}</p>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Etapa</label>
                        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${this.getStageChipClass(lead.etapa)}">${lead.etapa}</span>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">IA</label>
                        <p class="text-sm font-medium ${lead.estado_ia === 'ON' ? 'text-purple-600' : 'text-gray-400'}">${lead.estado_ia}</p>
                    </div>
                </div>
                ${lead.tags && lead.tags.length ? `
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold">Tags</label>
                        <div class="flex flex-wrap gap-1 mt-1">
                            ${lead.tags.map(t => `<span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">#${t}</span>`).join('')}
                        </div>
                    </div>` : ''}
                <div>
                    <label class="text-[10px] text-gray-400 uppercase font-bold">ID</label>
                    <p class="text-[10px] text-gray-400 font-mono">${lead.id}</p>
                </div>
            </div>
        `);
    },

    showNotesModal(id) {
        const lead = Store.getLeadById(id);
        if (!lead) return;

        this.showModal('Notas Internas', `
            <textarea id="notes-textarea" class="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-brand-orange outline-none resize-none"
                      placeholder="Escribe notas internas sobre este lead...">${lead.notas_internas || ''}</textarea>
        `,
            `<button onclick="UI.closeModal()" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
             <button onclick="UI.saveNotes('${id}')" class="px-4 py-2 text-sm bg-brand-orange text-white rounded-lg hover:bg-brand-dark transition font-medium">Guardar</button>`
        );
    },

    saveNotes(id) {
        const textarea = document.getElementById('notes-textarea');
        if (textarea) {
            Store.updateLead(id, { notas_internas: textarea.value });
        }
        this.closeModal();
    },

    // ══════════════════════════════════════════════════════
    // VISTA: PIPELINE (KANBAN)
    // ══════════════════════════════════════════════════════
    renderPipeline(container) {
        const stageColors = {
            'Nuevo': 'border-purple-500', 'Calificado': 'border-blue-500', 'Reservó': 'border-amber-500',
            'Cerrado': 'border-green-500', 'Sin respuesta': 'border-red-500', 'Perdido': 'border-gray-400'
        };

        container.innerHTML = `
            <div class="h-full flex flex-col page-transition">
                <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 class="font-bold text-gray-800 text-lg">Embudo de Ventas</h2>
                        <p class="text-xs text-gray-500">Arrastra las tarjetas para mover entre etapas</p>
                    </div>
                    <button onclick="UI.autoAssignAll()"
                            class="bg-brand-orange text-white text-xs px-3 py-2 rounded-lg font-semibold hover:bg-brand-dark transition flex items-center gap-1.5">
                        <i class="ph-bold ph-arrows-split"></i> Auto-asignar
                    </button>
                </div>
                <div class="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-4">
                    <div class="flex gap-3 md:gap-4 h-full min-w-max pb-4">
                        ${CONSTANTS.STAGES.map(stage => {
            const leads = Store.data.leads.filter(l => l.etapa === stage);
            return `
                                <div class="kanban-column w-64 md:w-72 flex flex-col bg-gray-50 rounded-xl border-t-4 ${stageColors[stage] || 'border-gray-400'} max-h-full"
                                     ondragover="UI.dragOver(event)" ondragleave="UI.dragLeave(event)" ondrop="UI.drop(event, '${stage}')">
                                    <div class="p-3 font-semibold text-gray-700 flex justify-between items-center text-sm sticky top-0 bg-gray-50 rounded-t-xl z-10">
                                        <span>${stage}</span>
                                        <span class="bg-white text-gray-500 px-2 rounded-full text-xs py-0.5 shadow-sm border border-gray-100">${leads.length}</span>
                                    </div>
                                    <div class="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                        ${leads.length === 0 ? `
                                            <div class="text-center text-gray-400 text-xs py-8 opacity-50">
                                                <i class="ph-duotone ph-drop text-2xl mb-2"></i>
                                                <p>Vacío</p>
                                            </div>
                                        ` : ''}
                                        ${leads.map(l => {
                const dn = l.cliente_nombre || l.telefono;
                return `
                                            <div draggable="true" ondragstart="UI.dragStart(event, '${l.id}')" ondragend="UI.dragEnd(event)"
                                                 onclick="UI.openChatFromKanban('${l.id}')"
                                                 class="kanban-card bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition group">
                                                <div class="flex justify-between mb-1">
                                                    <span class="font-semibold text-sm text-gray-800 truncate">${dn}</span>
                                                    <i class="ph-fill ${UI.getSourceIcon(l.fuente)} text-xs opacity-50"></i>
                                                </div>
                                                <p class="text-[11px] text-gray-500 truncate mb-2">${l.email || 'Sin email'}</p>
                                                <div class="flex justify-between items-center">
                                                    <span class="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100">${l.vendedor_asignado === 'Sin asignar' ? '—' : l.vendedor_asignado.split(' ')[0]}</span>
                                                    <span class="text-[10px] text-gray-400">${UI.timeAgo(l.ultima_actividad)}</span>
                                                </div>
                                            </div>`;
            }).join('')}
                                    </div>
                                </div>`;
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    autoAssignAll() {
        const count = Store.autoAssignAll();
        if (count > 0) {
            alert(`✅ ${count} leads asignados automáticamente a los vendedores.`);
            Router.navigate('pipeline');
        } else {
            alert('No hay leads sin asignar.');
        }
    },

    openChatFromKanban(id) {
        Router.navigate('inbox');
        setTimeout(() => UI.openChat(id), 150);
    },

    dragStart(ev, id) {
        ev.dataTransfer.setData('text/plain', id);
        ev.dataTransfer.effectAllowed = 'move';
        setTimeout(() => ev.target.classList.add('dragging'), 0);
    },
    dragEnd(ev) { ev.target.classList.remove('dragging'); },
    dragOver(ev) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        ev.currentTarget.classList.add('drag-over');
    },
    dragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); },
    drop(ev, stage) {
        ev.preventDefault();
        document.querySelectorAll('.drag-over').forEach(e => e.classList.remove('drag-over'));
        document.querySelectorAll('.dragging').forEach(e => e.classList.remove('dragging'));
        const id = ev.dataTransfer.getData('text/plain');
        if (id) {
            this.changeStage(id, stage);
            if (Router.currentRoute === 'pipeline') {
                setTimeout(() => Router.navigate('pipeline'), 100);
            }
        }
    },

    // ══════════════════════════════════════════════════════
    // VISTA: SETTINGS (Config)
    // ══════════════════════════════════════════════════════
    renderSettings(container) {
        const sellers = Store.data.sellers;
        const settings = Store.data.settings;

        container.innerHTML = `
            <div class="p-4 md:p-6 max-w-2xl mx-auto h-full overflow-y-auto page-transition pb-24 md:pb-8 custom-scrollbar">
                <div class="mb-6">
                    <h2 class="text-xl md:text-2xl font-bold text-gray-800">Configuración</h2>
                    <p class="text-sm text-gray-500">Gestión de vendedores, IA y datos</p>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-5 md:p-6 mb-5">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2">
                            <i class="ph-bold ph-users text-brand-orange"></i> Vendedores
                        </h3>
                        <button onclick="UI.showSellerModal()"
                                class="bg-brand-orange text-white text-xs px-3 py-2 rounded-lg font-semibold hover:bg-brand-dark transition flex items-center gap-1">
                            <i class="ph-bold ph-plus"></i> Agregar
                        </button>
                    </div>
                    <div class="space-y-2">
                        ${sellers.map(s => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center text-xs font-bold">
                                        ${s.name.split(' ').map(w => w[0]).join('')}
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-800">${s.name}</p>
                                        <p class="text-[10px] text-gray-400">${s.phone || ''}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onclick="UI.showSellerModal('${s.id}')" class="text-gray-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition">
                                        <i class="ph ph-pencil-simple text-sm"></i>
                                    </button>
                                    <button onclick="UI.confirmDeleteSeller('${s.id}', '${s.name}')" class="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition">
                                        <i class="ph ph-trash text-sm"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-5 md:p-6 mb-5">
                    <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="ph-bold ph-robot text-purple-600"></i> Agente IA
                    </h3>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                        <div>
                            <span class="text-sm font-medium">Modo IA</span>
                            <p class="text-[10px] text-gray-400">OpenAI usa la API real; Local es simulación</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500">Local</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="toggle-openai" ${settings.useOpenAI ? 'checked' : ''}
                                       onchange="UI.toggleOpenAI(this.checked)" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                            <span class="text-xs text-gray-500">OpenAI</span>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="text-xs font-medium text-gray-600 mb-1 block">Mensaje inicial del bot</label>
                            <textarea id="ai-greeting" class="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm h-20 focus:ring-2 focus:ring-brand-orange outline-none resize-none">${settings.aiGreeting}</textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs font-medium text-gray-600 mb-1 block">Horario inicio</label>
                                <input type="time" id="ai-schedule-start" value="${settings.aiScheduleStart}"
                                       class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-orange outline-none">
                            </div>
                            <div>
                                <label class="text-xs font-medium text-gray-600 mb-1 block">Horario fin</label>
                                <input type="time" id="ai-schedule-end" value="${settings.aiScheduleEnd}"
                                       class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-orange outline-none">
                            </div>
                        </div>
                        <button onclick="UI.saveAISettings()"
                                class="w-full bg-purple-600 text-white font-medium py-2.5 rounded-lg hover:bg-purple-700 transition text-sm">
                            Guardar configuración IA
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-5 md:p-6 mb-5">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span class="text-sm font-medium">Estado global del Bot</span>
                            <p class="text-[10px] text-gray-400">Responde automáticamente a leads nuevos</p>
                        </div>
                        <span class="text-xs font-bold ${settings.aiEnabled ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'} px-3 py-1 rounded-full">
                            ${settings.aiEnabled ? '● ACTIVO' : '○ INACTIVO'}
                        </span>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-5 md:p-6 border border-red-100">
                    <h3 class="font-bold text-red-500 mb-2 flex items-center gap-2">
                        <i class="ph-bold ph-warning"></i> Zona de Peligro
                    </h3>
                    <p class="text-xs text-gray-500 mb-4">Reiniciar borrará todos los chats y regenerará los 200 leads de demostración.</p>
                    <button onclick="if(confirm('¿Estás seguro? Se borrarán todos los datos.')) { localStorage.removeItem(CONSTANTS.STORAGE_KEY); location.reload(); }"
                            class="w-full border border-red-200 text-red-600 font-medium py-2.5 rounded-lg hover:bg-red-50 transition text-sm">
                        <i class="ph-bold ph-arrows-counter-clockwise"></i> Resetear Demo Completa
                    </button>
                </div>
            </div>
        `;
    },

    showSellerModal(sellerId) {
        const isEdit = !!sellerId;
        const seller = isEdit ? Store.data.sellers.find(s => s.id === sellerId) : { name: '', phone: '' };

        this.showModal(
            isEdit ? 'Editar Vendedor' : 'Agregar Vendedor',
            `<div class="space-y-4">
                <div>
                    <label class="text-xs font-medium text-gray-600 mb-1 block">Nombre completo *</label>
                    <input type="text" id="seller-name" value="${seller.name}"
                           class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                           placeholder="Ej: Juan Pérez">
                </div>
                <div>
                    <label class="text-xs font-medium text-gray-600 mb-1 block">Teléfono</label>
                    <input type="text" id="seller-phone" value="${seller.phone || ''}"
                           class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                           placeholder="Ej: 51987654321">
                </div>
            </div>`,
            `<button onclick="UI.closeModal()" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
             <button onclick="UI.saveSeller('${sellerId || ''}')" class="px-4 py-2 text-sm bg-brand-orange text-white rounded-lg hover:bg-brand-dark transition font-medium">
                ${isEdit ? 'Guardar cambios' : 'Agregar vendedor'}
             </button>`
        );
    },

    saveSeller(sellerId) {
        const name = document.getElementById('seller-name').value.trim();
        const phone = document.getElementById('seller-phone').value.trim();
        if (!name) { alert('El nombre es obligatorio.'); return; }

        if (sellerId) {
            Store.updateSeller(sellerId, { name, phone });
        } else {
            Store.addSeller({ name, phone });
        }
        this.closeModal();
        Router.navigate('settings');
    },

    confirmDeleteSeller(id, name) {
        this.showModal(
            'Eliminar vendedor',
            `<p class="text-gray-600 text-sm">¿Estás seguro de eliminar a <strong>${name}</strong>? Sus leads serán marcados como "Sin asignar".</p>`,
            `<button onclick="UI.closeModal()" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
             <button onclick="UI._deleteSeller('${id}')" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">Eliminar</button>`
        );
    },

    _deleteSeller(id) {
        Store.deleteSeller(id);
        this.closeModal();
        Router.navigate('settings');
    },

    toggleOpenAI(enabled) {
        Store.data.settings.useOpenAI = enabled;
        Store.save();
    },

    saveAISettings() {
        const greeting = document.getElementById('ai-greeting')?.value || '';
        const scheduleStart = document.getElementById('ai-schedule-start')?.value || '08:00';
        const scheduleEnd = document.getElementById('ai-schedule-end')?.value || '22:00';
        Store.data.settings.aiGreeting = greeting;
        Store.data.settings.aiScheduleStart = scheduleStart;
        Store.data.settings.aiScheduleEnd = scheduleEnd;
        Store.save();
        alert('✅ Configuración IA guardada correctamente.');
    },

    // Toggle sidebar móvil
    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobile-sidebar-backdrop');
        if (!sidebar || !backdrop) return;

        const isOpen = sidebar.classList.contains('translate-x-0');
        
        if (isOpen) {
            // Cerrar
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
            backdrop.classList.add('hidden');
        } else {
            // Abrir
            sidebar.classList.remove('hidden', '-translate-x-full');
            sidebar.classList.add('flex', 'translate-x-0');
            backdrop.classList.remove('hidden');
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 6. APP – Inicialización
// ─────────────────────────────────────────────────────────────
const App = {
    init() {
        Store.init();

        setInterval(() => {
            if (!Store.data.settings.aiEnabled) return;
            Store.data.leads.forEach(l => AI_Agent.checkAndRespond(l));
        }, 4000);

        if (sessionStorage.getItem('vt_auth')) {
            const role = sessionStorage.getItem('vt_role') || 'admin';
            this._applyRole(role);
            this.showApp();
        }

        window.addEventListener('hashchange', () => Router.handleHash());
    },

    login(role) {
        Store.data.currentUser = { role };
        sessionStorage.setItem('vt_auth', 'true');
        sessionStorage.setItem('vt_role', role);
        this._applyRole(role);
        this.showApp();
    },

    _applyRole(role) {
        const nameEl = document.getElementById('user-name');
        const avatarEl = document.getElementById('user-avatar');
        if (nameEl) nameEl.innerText = role === 'admin' ? 'Administrador' : role === 'supervisor' ? 'Supervisor' : 'Vendedor';
        if (avatarEl) avatarEl.innerText = role === 'admin' ? 'AD' : role === 'supervisor' ? 'SU' : 'VE';
    },

    showApp() {
        const auth = document.getElementById('auth-screen');
        const layout = document.getElementById('app-layout');
        if (auth) auth.classList.add('hidden');
        if (layout) {
            layout.classList.remove('hidden');
            layout.classList.add('flex');
        }
        UI.updateBadges();
        Router.handleHash();
    },

    logout() {
        sessionStorage.removeItem('vt_auth');
        sessionStorage.removeItem('vt_role');
        location.reload();
    }
};

// ── Arrancar al cargar DOM ──
window.addEventListener('DOMContentLoaded', () => App.init());
