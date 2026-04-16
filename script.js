// ===== ELEMENTOS =====
const form = document.getElementById("formGasto");
const lista = document.getElementById("listaGastos");
const descricao = document.getElementById("descricao");
const valor = document.getElementById("valor");
const tipo = document.getElementById("tipo");
const banco = document.getElementById("banco");
const modalidade = document.getElementById("modalidade");
const data = document.getElementById("data");

const totalEntrada = document.getElementById("totalEntrada");
const totalSaida = document.getElementById("totalSaida");
const saldoFinal = document.getElementById("saldoFinal");

const listaFatura = document.getElementById("listaFatura");
const listaBeneficioFiltrado = document.getElementById("listaBeneficioFiltrado");

const modal = document.getElementById("modalEditar");
const formEditar = document.getElementById("formEditar");
const fecharModal = document.querySelector(".fechar-modal");
const btnCancelar = document.querySelector(".btn-cancelar");

let principal = JSON.parse(localStorage.getItem("principal")) || [];
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
let sistemaInicializado = false;

let configUsuario = { beneficios: [], bancos: [], modalidades: [] };
let beneficioSelecionado = null;
let transacoesOriginais = [];
let bancoSelecionadoFatura = null;
let comprasOriginais = [];

let parcelas = JSON.parse(localStorage.getItem("parcelas")) || [];
let recorrentes = JSON.parse(localStorage.getItem("recorrentes")) || [];
let metaEconomia = JSON.parse(localStorage.getItem("metaEconomia")) || { valor: 0 };
let orcamentos = JSON.parse(localStorage.getItem("orcamentos")) || {};

let coresPersonalizadas = {
    entrada: "#00b09b",
    saida: "#ff416c",
    saldo: "#2193b0",
    beneficios: {},
    bancos: {}
};

let chartEntradaSaida = null;
let chartCategorias = null;
let chartEvolucao = null;

// Filtros dos gráficos
let filtroGraficoEntrada = true;
let filtroGraficoSaida = true;
let filtroGraficoSaldo = true;

if (usuarios.length === 0) {
    usuarios.push({ id: 1, nome: "Usuário Demo", email: "demo@financeiro.com", senha: "123456" });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
}

function formatarMoeda(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getSelecionados(id) {
    return Array.from(document.querySelectorAll(`#${id} input:checked`)).map(el => el.value);
}

function carregarConfiguracoes(userId) {
    const configSalva = localStorage.getItem(`config_${userId}`);
    if (configSalva) {
        configUsuario = JSON.parse(configSalva);
        return true;
    } else {
        configUsuario = { beneficios: ["VR", "VA", "VT"], bancos: ["Nubank", "Itaú", "Santander", "Bradesco"], modalidades: ["Dinheiro", "Débito", "Crédito", "Pix"] };
        return false;
    }
}

function salvarConfiguracoes(userId) {
    localStorage.setItem(`config_${userId}`, JSON.stringify(configUsuario));
}

function carregarCoresPersonalizadas() {
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    if(user) {
        const coresSalvas = localStorage.getItem(`cores_${user.id}`);
        if(coresSalvas) {
            coresPersonalizadas = JSON.parse(coresSalvas);
        }
    }
    aplicarCoresSalvas();
}

function salvarCoresPersonalizadas() {
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    if(user) {
        localStorage.setItem(`cores_${user.id}`, JSON.stringify(coresPersonalizadas));
    }
}

function aplicarCoresSalvas() {
    const cardEntrada = document.querySelector('.card.entrada');
    const cardSaida = document.querySelector('.card.saida');
    const cardSaldo = document.querySelector('.card.saldo');
    
    if(cardEntrada) cardEntrada.style.background = `linear-gradient(135deg, ${coresPersonalizadas.entrada}, ${coresPersonalizadas.entrada})`;
    if(cardSaida) cardSaida.style.background = `linear-gradient(135deg, ${coresPersonalizadas.saida}, ${coresPersonalizadas.saida})`;
    if(cardSaldo) cardSaldo.style.background = `linear-gradient(135deg, ${coresPersonalizadas.saldo}, ${coresPersonalizadas.saldo})`;
    
    document.querySelectorAll('.beneficio-card').forEach(card => {
        const nome = card.querySelector('h3')?.innerText;
        if(nome && coresPersonalizadas.beneficios[nome]) {
            card.style.background = `linear-gradient(135deg, ${coresPersonalizadas.beneficios[nome]}, ${coresPersonalizadas.beneficios[nome]})`;
        }
    });
    
    document.querySelectorAll('.fatura-cards .card').forEach(card => {
        const nome = card.querySelector('h3')?.innerText;
        if(nome && coresPersonalizadas.bancos[nome]) {
            card.style.background = `linear-gradient(135deg, ${coresPersonalizadas.bancos[nome]}, ${coresPersonalizadas.bancos[nome]})`;
        }
    });
}

function aplicarConfiguracoes() {
    const selectsBanco = [banco, document.getElementById("editarBanco"), document.getElementById("parcBanco"), document.getElementById("recBanco")];
    selectsBanco.forEach(sel => {
        if(sel) {
            sel.innerHTML = '<option value="">Banco</option>';
            configUsuario.bancos.forEach(b => sel.innerHTML += `<option>${b}</option>`);
        }
    });

    const filtroBancoDiv = document.getElementById("filtroBanco");
    if(filtroBancoDiv) {
        filtroBancoDiv.innerHTML = '';
        configUsuario.bancos.forEach(b => filtroBancoDiv.innerHTML += `<label><input type="checkbox" value="${b}"> <span>${b}</span></label>`);
    }

    const todasModalidades = [...configUsuario.beneficios, ...configUsuario.modalidades];
    
    const selectsModalidade = [modalidade, document.getElementById("editarModalidade"), document.getElementById("recModalidade")];
    selectsModalidade.forEach(sel => {
        if(sel) {
            sel.innerHTML = '<option value="">Modalidade</option>';
            todasModalidades.forEach(m => sel.innerHTML += `<option>${m}</option>`);
        }
    });
    
    const categoriaSelect = document.getElementById("categoriaOrcamento");
    if(categoriaSelect) {
        categoriaSelect.innerHTML = '<option value="">Selecione uma categoria</option>';
        todasModalidades.forEach(m => categoriaSelect.innerHTML += `<option value="${m}">${m}</option>`);
    }

    const filtroModalidadeDiv = document.getElementById("filtroModalidade");
    if(filtroModalidadeDiv) {
        filtroModalidadeDiv.innerHTML = '';
        todasModalidades.forEach(m => filtroModalidadeDiv.innerHTML += `<label><input type="checkbox" value="${m}"> <span>${m}</span></label>`);
    }

    const container = document.getElementById("beneficiosContainer");
    if(container) {
        container.innerHTML = '';
        if (configUsuario.beneficios.length === 0) {
            container.innerHTML = '<div class="sem-itens" style="text-align: center; padding: 40px; color: #666;">Nenhum benefício cadastrado. Configure em Perfil > Editar Configurações.</div>';
        } else {
            const cores = ['#00b09b', '#ff416c', '#2193b0', '#6a11cb', '#ff8008', '#1D976C', '#F2994A', '#cb2d3e'];
            configUsuario.beneficios.forEach((b, i) => {
                const cor = coresPersonalizadas.beneficios[b] || cores[i % cores.length];
                container.innerHTML += `<div class="beneficio-card" onclick="filtrarBeneficio('${b}')" style="background: linear-gradient(135deg, ${cor}, ${cor});"><h3>${b}</h3><p>Saldo: <span id="saldo_${b}">R$ 0</span></p><p class="detalhe">👆 Clique para ver transações</p></div>`;
            });
        }
    }

    const faturaContainer = document.getElementById("faturaContainer");
    if(faturaContainer) {
        faturaContainer.innerHTML = '';
        const coresFatura = ['#8E2DE2', '#FF8008', '#CB2D3E', '#1D976C', '#F2994A', '#FF6B6B', '#FF7E5F', '#00B4DB'];
        configUsuario.bancos.forEach((b, i) => {
            const cor = coresPersonalizadas.bancos[b] || coresFatura[i % coresFatura.length];
            const bancoId = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            faturaContainer.innerHTML += `
                <div class="card" onclick="filtrarBancoCredito('${b.replace(/'/g, "\\'")}')" style="background: linear-gradient(135deg, ${cor}, ${cor}); cursor: pointer;">
                    <h3>${b}</h3>
                    <p class="fatura-text"><strong>Fatura:</strong> <span id="fatura_${bancoId}">R$ 0</span></p>
                    <p class="saldo-text"><strong>Saldo:</strong> <span id="saldo_banco_${bancoId}">R$ 0</span></p>
                    <p class="detalhe">👆 Clique para ver compras</p>
                </div>
            `;
        });
    }

    carregarCoresPersonalizadas();
    atualizarFatura();
    carregarParcelas();
    carregarRecorrentes();
    carregarMeta();
    carregarOrcamentos();
}

function carregarParcelas() {
    const listaDiv = document.getElementById("listaParcelas");
    if(!listaDiv) return;
    
    listaDiv.innerHTML = '';
    parcelas.forEach((p, index) => {
        const valorParcela = p.valorTotal / p.numParcelas;
        const parcelasPagas = p.parcelasPagas || 0;
        const progresso = (parcelasPagas / p.numParcelas) * 100;
        
        listaDiv.innerHTML += `
            <div class="parcela-item">
                <div>
                    <strong>${p.descricao}</strong><br>
                    <small>Banco: ${p.banco} | Total: ${formatarMoeda(p.valorTotal)} | ${p.numParcelas}x de ${formatarMoeda(valorParcela)}</small>
                </div>
                <div>
                    <button onclick="pagarParcela(${index})" class="btn-salvar" style="padding: 5px 10px;">💰 Pagar Próxima</button>
                    <button onclick="removerParcela(${index})" class="btn-cancelar" style="padding: 5px 10px;">🗑️ Remover</button>
                </div>
                <div class="parcela-progresso">
                    <div class="parcela-bar" style="width: ${progresso}%"></div>
                </div>
                <small>${parcelasPagas} de ${p.numParcelas} parcelas pagas</small>
            </div>
        `;
    });
    
    atualizarProximasParcelas();
}

function atualizarProximasParcelas() {
    const proximasDiv = document.getElementById("proximasParcelas");
    if(!proximasDiv) return;
    
    proximasDiv.innerHTML = '';
    const hoje = new Date();
    const proximas = [];
    
    parcelas.forEach(p => {
        const dataBase = new Date(p.dataInicio);
        const parcelasPagas = p.parcelasPagas || 0;
        if(parcelasPagas < p.numParcelas) {
            const proxData = new Date(dataBase);
            proxData.setMonth(dataBase.getMonth() + parcelasPagas);
            if(proxData >= hoje) {
                proximas.push({
                    descricao: p.descricao,
                    valor: p.valorTotal / p.numParcelas,
                    data: proxData,
                    parcela: parcelasPagas + 1,
                    total: p.numParcelas
                });
            }
        }
    });
    
    proximas.sort((a,b) => a.data - b.data);
    proximas.slice(0, 10).forEach(p => {
        proximasDiv.innerHTML += `
            <div class="proxima-parcela">
                <span>${p.descricao}</span>
                <span>${formatarMoeda(p.valor)}</span>
                <span>${p.data.toLocaleDateString()}</span>
                <span>Parcela ${p.parcela}/${p.total}</span>
            </div>
        `;
    });
}

function pagarParcela(index) {
    const parcela = parcelas[index];
    const valorParcela = parcela.valorTotal / parcela.numParcelas;
    const novaParcela = {
        ...parcela,
        parcelasPagas: (parcela.parcelasPagas || 0) + 1
    };
    
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    principal.push({
        id: Date.now(),
        descricao: `${parcela.descricao} - Parcela ${novaParcela.parcelasPagas}/${parcela.numParcelas}`,
        valor: valorParcela,
        tipo: "saida",
        modalidade: "Crédito",
        banco: parcela.banco,
        data: dataFormatada
    });
    
    parcelas[index] = novaParcela;
    
    if(novaParcela.parcelasPagas >= parcela.numParcelas) {
        parcelas.splice(index, 1);
    }
    
    localStorage.setItem("parcelas", JSON.stringify(parcelas));
    localStorage.setItem("principal", JSON.stringify(principal));
    
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    if(user) localStorage.setItem(`dados_${user.id}`, JSON.stringify(principal));
    
    carregarParcelas();
    atualizarTabela();
    mostrarFeedback(`✅ Parcela paga! Restam ${parcela.numParcelas - novaParcela.parcelasPagas} parcelas`);
}

function removerParcela(index) {
    if(confirm("Remover esta compra parcelada?")) {
        parcelas.splice(index, 1);
        localStorage.setItem("parcelas", JSON.stringify(parcelas));
        carregarParcelas();
        mostrarFeedback("✅ Compra parcelada removida!");
    }
}

function carregarRecorrentes() {
    const listaDiv = document.getElementById("listaRecorrentes");
    if(!listaDiv) return;
    
    listaDiv.innerHTML = '';
    recorrentes.forEach((r, index) => {
        listaDiv.innerHTML += `
            <div class="recorrente-item">
                <div>
                    <strong>${r.descricao}</strong><br>
                    <small>Valor: ${formatarMoeda(r.valor)} | Tipo: ${r.tipo} | Dia: ${r.dia}</small>
                    <small>Banco: ${r.banco || '-'} | Modalidade: ${r.modalidade}</small>
                </div>
                <div>
                    <button onclick="removerRecorrente(${index})" class="btn-cancelar" style="padding: 5px 10px;">🗑️ Remover</button>
                </div>
            </div>
        `;
    });
}

function removerRecorrente(index) {
    if(confirm("Remover esta despesa recorrente?")) {
        recorrentes.splice(index, 1);
        localStorage.setItem("recorrentes", JSON.stringify(recorrentes));
        carregarRecorrentes();
        mostrarFeedback("✅ Despesa recorrente removida!");
    }
}

function executarRecorrentes() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    let adicionadas = 0;
    
    recorrentes.forEach(r => {
        const dataRecorrente = new Date(anoAtual, mesAtual, parseInt(r.dia));
        if(dataRecorrente <= hoje) {
            const jaExiste = principal.some(t => 
                t.descricao === r.descricao && 
                t.data === dataRecorrente.toISOString().split('T')[0]
            );
            
            if(!jaExiste) {
                principal.push({
                    id: Date.now() + adicionadas,
                    descricao: r.descricao,
                    valor: r.valor,
                    tipo: r.tipo,
                    modalidade: r.modalidade,
                    banco: r.banco || "",
                    data: dataRecorrente.toISOString().split('T')[0]
                });
                adicionadas++;
            }
        }
    });
    
    if(adicionadas > 0) {
        localStorage.setItem("principal", JSON.stringify(principal));
        const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
        if(user) localStorage.setItem(`dados_${user.id}`, JSON.stringify(principal));
        atualizarTabela();
        mostrarFeedback(`✅ ${adicionadas} despesas recorrentes adicionadas!`);
    } else {
        mostrarFeedback("ℹ️ Nenhuma despesa recorrente para processar este mês");
    }
}

function carregarMeta() {
    const metaSalva = localStorage.getItem("metaEconomia");
    if (metaSalva) {
        metaEconomia = JSON.parse(metaSalva);
        if (metaEconomia.valor > 0) {
            const metaInput = document.getElementById("metaValor");
            if (metaInput) metaInput.value = metaEconomia.valor;
        }
    }
    atualizarMeta();
}

function salvarMeta() {
    const metaInput = document.getElementById("metaValor");
    let valor = parseFloat(metaInput.value);
    if (isNaN(valor) || valor <= 0) {
        alert("Digite um valor válido para a meta!");
        return;
    }
    metaEconomia.valor = valor;
    localStorage.setItem("metaEconomia", JSON.stringify(metaEconomia));
    atualizarMeta();
    mostrarFeedback(`✅ Meta de ${formatarMoeda(valor)} definida!`);
}

function atualizarMeta() {
    const metaInfo = document.getElementById("metaInfo");
    const progressoBar = document.getElementById("progressoMeta");
    
    if (!metaInfo) return;
    
    let entrada = 0, saida = 0;
    principal.forEach(i => {
        if (!configUsuario.beneficios.includes(i.modalidade)) {
            if (i.tipo === "entrada") entrada += i.valor;
            else if (i.tipo === "saida" && i.modalidade !== "Crédito") saida += i.valor;
        }
    });
    const saldoAtual = entrada - saida;
    
    const economiaMesElem = document.getElementById("economiaMes");
    const percentualMetaElem = document.getElementById("percentualMeta");
    const faltaMetaElem = document.getElementById("faltaMeta");
    
    if (economiaMesElem) economiaMesElem.textContent = formatarMoeda(saldoAtual);
    
    if (metaEconomia.valor > 0) {
        const progresso = Math.min(100, (saldoAtual / metaEconomia.valor) * 100);
        const falta = Math.max(0, metaEconomia.valor - saldoAtual);
        
        if (percentualMetaElem) percentualMetaElem.textContent = `${Math.round(progresso)}%`;
        if (faltaMetaElem) faltaMetaElem.textContent = formatarMoeda(falta);
        
        progressoBar.style.width = `${progresso}%`;
        progressoBar.textContent = `${Math.round(progresso)}%`;
        
        if (progresso >= 100) {
            progressoBar.style.background = "linear-gradient(90deg, #4caf50, #8bc34a)";
            metaInfo.innerHTML = "🎉 PARABÉNS! META ATINGIDA! 🎉";
            metaInfo.style.color = "#ffeb3b";
            metaInfo.style.fontWeight = "bold";
        } else if (progresso >= 70) {
            progressoBar.style.background = "linear-gradient(90deg, #ff9800, #ffc107)";
            metaInfo.innerHTML = `💰 Faltam ${formatarMoeda(falta)} para atingir sua meta!`;
            metaInfo.style.color = "white";
            metaInfo.style.fontWeight = "normal";
        } else {
            progressoBar.style.background = "linear-gradient(90deg, #2196f3, #00bcd4)";
            metaInfo.innerHTML = `💰 Faltam ${formatarMoeda(falta)} para atingir sua meta!`;
            metaInfo.style.color = "white";
            metaInfo.style.fontWeight = "normal";
        }
    } else {
        progressoBar.style.width = "0%";
        progressoBar.textContent = "";
        metaInfo.innerHTML = "📌 Defina uma meta de economia acima para começar!";
        metaInfo.style.color = "white";
        metaInfo.style.fontWeight = "normal";
        
        if (percentualMetaElem) percentualMetaElem.textContent = "0%";
        if (faltaMetaElem) faltaMetaElem.textContent = formatarMoeda(0);
    }
}

function carregarOrcamentos() {
    const orcamentosSalvos = localStorage.getItem("orcamentos");
    if(orcamentosSalvos) {
        orcamentos = JSON.parse(orcamentosSalvos);
    }
    atualizarOrcamentos();
}

function adicionarOrcamento() {
    const categoria = document.getElementById("categoriaOrcamento").value;
    const valor = parseFloat(document.getElementById("valorOrcamento").value);
    
    if(!categoria || isNaN(valor) || valor <= 0) {
        alert("Selecione uma categoria e digite um valor válido!");
        return;
    }
    
    orcamentos[categoria] = valor;
    localStorage.setItem("orcamentos", JSON.stringify(orcamentos));
    atualizarOrcamentos();
    mostrarFeedback(`✅ Orçamento de ${formatarMoeda(valor)} definido para ${categoria}`);
    document.getElementById("valorOrcamento").value = "";
}

function atualizarOrcamentos() {
    const listaDiv = document.getElementById("listaOrcamentos");
    if(!listaDiv) return;
    
    listaDiv.innerHTML = '';
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const gastosPorCategoria = {};
    
    principal.forEach(t => {
        if(t.tipo === "saida") {
            const dataTransacao = new Date(t.data);
            if(dataTransacao.getMonth() === mesAtual && dataTransacao.getFullYear() === anoAtual) {
                gastosPorCategoria[t.modalidade] = (gastosPorCategoria[t.modalidade] || 0) + t.valor;
            }
        }
    });
    
    for(const [categoria, limite] of Object.entries(orcamentos)) {
        const gasto = gastosPorCategoria[categoria] || 0;
        const percentual = Math.min(100, (gasto / limite) * 100);
        let corClasse = "verde";
        if(percentual >= 100) corClasse = "vermelho";
        else if(percentual >= 80) corClasse = "amarelo";
        
        listaDiv.innerHTML += `
            <div class="orcamento-item">
                <strong>${categoria}</strong>
                <span>Gasto: ${formatarMoeda(gasto)}</span>
                <span>Limite: ${formatarMoeda(limite)}</span>
                <div class="orcamento-progresso">
                    <div class="orcamento-bar ${corClasse}" style="width: ${percentual}%"></div>
                </div>
                <span>${Math.round(percentual)}%</span>
                <button onclick="removerOrcamento('${categoria}')" class="btn-remover" style="padding: 5px 10px;">✖</button>
            </div>
        `;
    }
}

function removerOrcamento(categoria) {
    delete orcamentos[categoria];
    localStorage.setItem("orcamentos", JSON.stringify(orcamentos));
    atualizarOrcamentos();
    mostrarFeedback(`✅ Orçamento de ${categoria} removido!`);
}

function aplicarFiltroGrafico() {
    filtroGraficoEntrada = document.getElementById("filtroGraficoEntrada")?.checked ?? true;
    filtroGraficoSaida = document.getElementById("filtroGraficoSaida")?.checked ?? true;
    filtroGraficoSaldo = document.getElementById("filtroGraficoSaldo")?.checked ?? true;
    atualizarGraficos();
}

function atualizarGraficos() {
    let totalEntradas = 0, totalSaidas = 0;
    
    principal.forEach(i => {
        if(!configUsuario.beneficios.includes(i.modalidade)) {
            if(i.tipo === "entrada" && filtroGraficoEntrada) totalEntradas += i.valor;
            else if(i.tipo === "saida" && i.modalidade !== "Crédito" && filtroGraficoSaida) totalSaidas += i.valor;
        }
    });
    
    // Gráfico Entradas vs Saídas
    const ctx1 = document.getElementById('chartEntradaSaida')?.getContext('2d');
    if(ctx1) {
        if(chartEntradaSaida) chartEntradaSaida.destroy();
        
        const labels = [];
        const dados = [];
        const cores = [];
        
        if(filtroGraficoEntrada) {
            labels.push('Entradas');
            dados.push(totalEntradas);
            cores.push('#00b09b');
        }
        if(filtroGraficoSaida) {
            labels.push('Saídas');
            dados.push(totalSaidas);
            cores.push('#ff416c');
        }
        
        chartEntradaSaida = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valores',
                    data: dados,
                    backgroundColor: cores,
                    borderRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => formatarMoeda(ctx.raw) } }
                }
            }
        });
    }
    
    // Gráfico Gastos por Categoria
    const gastosCategoria = {};
    principal.forEach(i => {
        if(i.tipo === "saida" && !configUsuario.beneficios.includes(i.modalidade) && filtroGraficoSaida) {
            gastosCategoria[i.modalidade] = (gastosCategoria[i.modalidade] || 0) + i.valor;
        }
    });
    
    const ctx2 = document.getElementById('chartCategorias')?.getContext('2d');
    if(ctx2) {
        if(chartCategorias) chartCategorias.destroy();
        const cores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        chartCategorias = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: Object.keys(gastosCategoria),
                datasets: [{
                    data: Object.values(gastosCategoria),
                    backgroundColor: cores.slice(0, Object.keys(gastosCategoria).length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatarMoeda(ctx.raw)}` } }
                }
            }
        });
    }
    
    // Gráfico Evolução Mensal
    const meses = {};
    principal.forEach(i => {
        if(!configUsuario.beneficios.includes(i.modalidade)) {
            const dataObj = new Date(i.data);
            const mesAno = `${dataObj.toLocaleString('default', { month: 'short' })}/${dataObj.getFullYear()}`;
            if(!meses[mesAno]) meses[mesAno] = { entradas: 0, saidas: 0, saldo: 0 };
            
            if(i.tipo === "entrada" && filtroGraficoEntrada) meses[mesAno].entradas += i.valor;
            else if(i.tipo === "saida" && i.modalidade !== "Crédito" && filtroGraficoSaida) meses[mesAno].saidas += i.valor;
            
            meses[mesAno].saldo = meses[mesAno].entradas - meses[mesAno].saidas;
        }
    });
    
    const ctx3 = document.getElementById('chartEvolucao')?.getContext('2d');
    if(ctx3) {
        if(chartEvolucao) chartEvolucao.destroy();
        
        const datasets = [];
        if(filtroGraficoEntrada) {
            datasets.push({ 
                label: 'Entradas', 
                data: Object.values(meses).map(m => m.entradas), 
                borderColor: '#00b09b', 
                backgroundColor: 'rgba(0,176,155,0.1)', 
                fill: true, 
                tension: 0.4 
            });
        }
        if(filtroGraficoSaida) {
            datasets.push({ 
                label: 'Saídas', 
                data: Object.values(meses).map(m => m.saidas), 
                borderColor: '#ff416c', 
                backgroundColor: 'rgba(255,65,108,0.1)', 
                fill: true, 
                tension: 0.4 
            });
        }
        if(filtroGraficoSaldo) {
            datasets.push({ 
                label: 'Saldo', 
                data: Object.values(meses).map(m => m.saldo), 
                borderColor: '#2193b0', 
                backgroundColor: 'rgba(33,147,176,0.1)', 
                fill: true, 
                tension: 0.4,
                borderDash: [5, 5]
            });
        }
        
        chartEvolucao = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: Object.keys(meses),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatarMoeda(ctx.raw)}` } }
                }
            }
        });
    }
}

function exportarExcel() {
    let csv = "Data,Descrição,Valor,Tipo,Modalidade,Banco\n";
    principal.forEach(t => {
        csv += `${t.data},${t.descricao},${t.valor},${t.tipo},${t.modalidade},${t.banco || "-"}\n`;
    });
    
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", "financas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarFeedback("✅ Relatório exportado com sucesso!");
}

function atualizarBeneficiosDinamico() {
    if (!configUsuario.beneficios.length) return;
    let saldos = {};
    configUsuario.beneficios.forEach(b => saldos[b] = 0);
    principal.forEach(item => {
        if(configUsuario.beneficios.includes(item.modalidade)) {
            if(item.tipo === "entrada") saldos[item.modalidade] += item.valor;
            else if(item.tipo === "saida") saldos[item.modalidade] -= item.valor;
        }
    });
    configUsuario.beneficios.forEach(b => { let span = document.getElementById(`saldo_${b}`); if(span) span.textContent = formatarMoeda(saldos[b]); });
}

function atualizarFatura() {
    let totaisFatura = {};
    let saldosBancos = {};
    
    configUsuario.bancos.forEach(b => {
        totaisFatura[b] = 0;
        saldosBancos[b] = 0;
    });
    
    principal.forEach(i => {
        if(i.modalidade === "Crédito" && i.tipo === "saida" && totaisFatura[i.banco] !== undefined) {
            totaisFatura[i.banco] += i.valor;
        }
        
        if(saldosBancos[i.banco] !== undefined) {
            if(i.tipo === "entrada") {
                saldosBancos[i.banco] += i.valor;
            } else if(i.tipo === "saida" && i.modalidade !== "Crédito") {
                saldosBancos[i.banco] -= i.valor;
            }
        }
    });
    
    configUsuario.bancos.forEach(b => {
        const bancoId = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        
        const faturaSpan = document.getElementById(`fatura_${bancoId}`);
        if (faturaSpan) faturaSpan.textContent = formatarMoeda(totaisFatura[b] || 0);
        
        const saldoSpan = document.getElementById(`saldo_banco_${bancoId}`);
        if (saldoSpan) saldoSpan.textContent = formatarMoeda(saldosBancos[b] || 0);
    });
    
    if(!bancoSelecionadoFatura) {
        document.getElementById("tituloFaturaFiltro").innerHTML = "Compras no Crédito (pendentes)";
        document.getElementById("filtroBancoAtivo").innerHTML = "";
        const compras = principal.filter(i => i.modalidade === "Crédito" && i.tipo === "saida");
        listaFatura.innerHTML = "";
        if(!compras.length) listaFatura.innerHTML = `<tr><td colspan="5">Nenhuma compra</td>`;
        else compras.forEach(i => { 
            const row = listaFatura.insertRow(); 
            row.innerHTML = `<td>${i.descricao}</td><td style="color:#ff416c">${formatarMoeda(i.valor)}</td><td>${i.banco}</td><td>${i.data}</td><td>Crédito</td>`;
        });
    }
}

function verificarLogin() {
    const usuarioLogado = sessionStorage.getItem("usuarioLogado");
    if(usuarioLogado) {
        const user = JSON.parse(usuarioLogado);
        document.getElementById("userNome").textContent = user.nome;
        document.getElementById("telaLogin").style.display = "none";
        document.getElementById("telaRegistro").style.display = "none";
        document.getElementById("telaRecuperar").style.display = "none";
        
        const configurado = carregarConfiguracoes(user.id);
        if(!configurado) {
            document.getElementById("telaConfiguracao").style.display = "flex";
            document.getElementById("sistemaPrincipal").style.display = "none";
        } else {
            aplicarConfiguracoes();
            document.getElementById("telaConfiguracao").style.display = "none";
            document.getElementById("sistemaPrincipal").style.display = "block";
            if(!sistemaInicializado) { sistemaInicializado = true; setTimeout(() => { atualizarTabela(); atualizarGraficos(); }, 100); }
        }
    } else {
        document.getElementById("telaLogin").style.display = "flex";
        document.getElementById("sistemaPrincipal").style.display = "none";
        sistemaInicializado = false;
    }
}

document.getElementById("formLogin").onsubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginSenha").value;
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);
    if(usuario) {
        sessionStorage.setItem("usuarioLogado", JSON.stringify({ id: usuario.id, nome: usuario.nome, email: usuario.email }));
        const chaveDados = `dados_${usuario.id}`;
        let dadosUsuario = JSON.parse(localStorage.getItem(chaveDados));
        principal = dadosUsuario || [];
        localStorage.setItem("principal", JSON.stringify(principal));
        
        const parcelasUser = localStorage.getItem(`parcelas_${usuario.id}`);
        parcelas = parcelasUser ? JSON.parse(parcelasUser) : [];
        const recorrentesUser = localStorage.getItem(`recorrentes_${usuario.id}`);
        recorrentes = recorrentesUser ? JSON.parse(recorrentesUser) : [];
        
        verificarLogin();
    } else alert("❌ E-mail ou senha incorretos!");
};

document.getElementById("formRegistro").onsubmit = function(e) {
    e.preventDefault();
    const nome = document.getElementById("regNome").value;
    const email = document.getElementById("regEmail").value;
    const senha = document.getElementById("regSenha").value;
    const confirmar = document.getElementById("regConfirmarSenha").value;
    if(senha !== confirmar) return alert("As senhas não coincidem!");
    if(senha.length < 6) return alert("Mínimo 6 caracteres!");
    if(usuarios.find(u => u.email === email)) return alert("E-mail já cadastrado!");
    usuarios.push({ id: Date.now(), nome, email, senha });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    alert("Conta criada! Faça login.");
    mostrarLogin();
};

document.getElementById("formRecuperar").onsubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById("recEmail").value;
    const user = usuarios.find(u => u.email === email);
    alert(user ? `Sua senha é: ${user.senha}` : "E-mail não encontrado!");
};

document.getElementById("formConfiguracao").onsubmit = function(e) {
    e.preventDefault();
    const beneficios = [...document.querySelectorAll("#listaBeneficiosConfig .config-input")].map(i => i.value.trim().toUpperCase()).filter(v => v);
    const bancos = [...document.querySelectorAll("#listaBancosConfig .config-input")].map(i => i.value.trim()).filter(v => v);
    const modalidades = [...document.querySelectorAll("#listaModalidadesConfig .config-input")].map(i => i.value.trim()).filter(v => v);
    if(bancos.length === 0 || modalidades.length === 0) return alert("Preencha pelo menos um banco e uma forma de pagamento!");
    configUsuario = { beneficios, bancos, modalidades };
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    if(user) salvarConfiguracoes(user.id);
    aplicarConfiguracoes();
    document.getElementById("telaConfiguracao").style.display = "none";
    document.getElementById("sistemaPrincipal").style.display = "block";
    atualizarTabela();
};

document.getElementById("formParcelado")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const descricao = document.getElementById("parcDescricao").value;
    const valorTotal = parseFloat(document.getElementById("parcValorTotal").value);
    const numParcelas = parseInt(document.getElementById("parcNumero").value);
    const banco = document.getElementById("parcBanco").value;
    const dataInicio = document.getElementById("parcData").value;
    
    if(!descricao || !valorTotal || !numParcelas || !banco || !dataInicio) {
        alert("Preencha todos os campos!");
        return;
    }
    
    parcelas.push({
        id: Date.now(),
        descricao,
        valorTotal,
        numParcelas,
        banco,
        dataInicio,
        parcelasPagas: 0
    });
    
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    if(user) localStorage.setItem(`parcelas_${user.id}`, JSON.stringify(parcelas));
    localStorage.setItem("parcelas", JSON.stringify(parcelas));
    
    document.getElementById("formParcelado").reset();
    carregarParcelas();
    mostrarFeedback(`✅ Compra parcelada adicionada! ${numParcelas}x de ${formatarMoeda(valorTotal/numParcelas)}`);
});

document.getElementById("formRecorrente")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const descricao = document.getElementById("recDescricao").value;
    const valor = parseFloat(document.getElementById("recValor").value);
    const tipo = document.getElementById("recTipo").value;
    const banco = document.getElementById("recBanco").value;
    const modalidade = document.getElementById("recModalidade").value;
    const dia = parseInt(document.getElementById("recDia").value);
    
    if(!descricao || !valor || !tipo || !modalidade || !dia) {
        alert("Preencha todos os campos!");
        return;
    }
    
    recorrentes.push({
        id: Date.now(),
        descricao,
        valor,
        tipo,
        banco: banco || "",
        modalidade,
        dia
    });
    
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    if(user) localStorage.setItem(`recorrentes_${user.id}`, JSON.stringify(recorrentes));
    localStorage.setItem("recorrentes", JSON.stringify(recorrentes));
    
    document.getElementById("formRecorrente").reset();
    carregarRecorrentes();
    mostrarFeedback(`✅ Despesa recorrente adicionada! Dia ${dia} de cada mês.`);
});

function adicionarItemConfig(listaId) {
    const div = document.createElement("div");
    div.className = "config-item";
    div.innerHTML = `<input type="text" class="config-input"><button type="button" onclick="removerItemConfig(this)" class="btn-remover">✖</button>`;
    document.getElementById(listaId).appendChild(div);
}

function adicionarSugestao(listaId, valor) {
    const lista = document.getElementById(listaId);
    const div = document.createElement("div");
    div.className = "config-item";
    div.innerHTML = `<input type="text" class="config-input" value="${valor}"><button type="button" onclick="removerItemConfig(this)" class="btn-remover">✖</button>`;
    lista.appendChild(div);
}

function removerItemConfig(btn) { btn.parentElement.remove(); }
function mostrarRegistro() { document.getElementById("telaLogin").style.display = "none"; document.getElementById("telaRegistro").style.display = "flex"; }
function mostrarLogin() { document.getElementById("telaLogin").style.display = "flex"; document.getElementById("telaRegistro").style.display = "none"; document.getElementById("telaRecuperar").style.display = "none"; }
function mostrarRecuperarSenha() { document.getElementById("telaLogin").style.display = "none"; document.getElementById("telaRecuperar").style.display = "flex"; }
function logout() { sessionStorage.removeItem("usuarioLogado"); sistemaInicializado = false; verificarLogin(); }
function abrirPerfil() { document.getElementById("sistemaPrincipal").style.display = "none"; document.getElementById("telaPerfil").style.display = "flex"; carregarPerfil(); }
function fecharPerfil() { document.getElementById("telaPerfil").style.display = "none"; document.getElementById("sistemaPrincipal").style.display = "block"; }
function abrirConfiguracoes() { document.getElementById("telaPerfil").style.display = "none"; document.getElementById("telaConfiguracao").style.display = "flex"; }

function carregarPerfil() {
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const info = document.getElementById("perfilInfo");
    info.innerHTML = `<h4>📋 Dados</h4><p><strong>Nome:</strong> ${user.nome}</p><p><strong>Email:</strong> ${user.email}</p><h4>🎁 Benefícios</h4><ul>${configUsuario.beneficios.map(b => `<li>${b}</li>`).join('') || '<li>Nenhum benefício cadastrado</li>'}</ul><h4>🏦 Bancos</h4><ul>${configUsuario.bancos.map(b => `<li>${b}</li>`).join('')}</ul><h4>💳 Pagamentos</h4><ul>${configUsuario.modalidades.map(m => `<li>${m}</li>`).join('')}</ul>`;
}

function abrirPersonalizacaoCores() {
    const listaBeneficios = document.getElementById("listaCoresBeneficios");
    if(listaBeneficios) {
        listaBeneficios.innerHTML = '';
        configUsuario.beneficios.forEach(beneficio => {
            const corAtual = coresPersonalizadas.beneficios[beneficio] || '#00b09b';
            listaBeneficios.innerHTML += `
                <div class="item-cor-modern">
                    <span>${beneficio}</span>
                    <input type="color" class="cor-beneficio-input" data-beneficio="${beneficio}" value="${corAtual}">
                </div>
            `;
        });
    }
    
    const listaBancos = document.getElementById("listaCoresBancos");
    if(listaBancos) {
        listaBancos.innerHTML = '';
        configUsuario.bancos.forEach(banco => {
            const corAtual = coresPersonalizadas.bancos[banco] || '#667eea';
            listaBancos.innerHTML += `
                <div class="item-cor-modern">
                    <span>${banco}</span>
                    <input type="color" class="cor-banco-input" data-banco="${banco}" value="${corAtual}">
                </div>
            `;
        });
    }
    
    document.getElementById("corEntrada").value = coresPersonalizadas.entrada;
    document.getElementById("corSaida").value = coresPersonalizadas.saida;
    document.getElementById("corSaldo").value = coresPersonalizadas.saldo;
    
    document.getElementById("sistemaPrincipal").style.display = "none";
    document.getElementById("telaCores").style.display = "flex";
}

function fecharTelaCores() {
    document.getElementById("telaCores").style.display = "none";
    document.getElementById("sistemaPrincipal").style.display = "block";
}

function mostrarFeedback(mensagem) {
    const toast = document.createElement('div');
    toast.textContent = mensagem;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #00b09b, #96c93d);
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        animation: fadeInOut 2s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2000);
}

const styleToast = document.createElement('style');
styleToast.textContent = `@keyframes fadeInOut { 0% { opacity: 0; transform: translateX(-50%) translateY(20px); } 15% { opacity: 1; transform: translateX(-50%) translateY(0); } 85% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-20px); } }`;
document.head.appendChild(styleToast);

document.getElementById("formCores")?.addEventListener("submit", function(e) {
    e.preventDefault();
    coresPersonalizadas.entrada = document.getElementById("corEntrada").value;
    coresPersonalizadas.saida = document.getElementById("corSaida").value;
    coresPersonalizadas.saldo = document.getElementById("corSaldo").value;
    
    document.querySelectorAll('.cor-beneficio-input').forEach(input => {
        coresPersonalizadas.beneficios[input.getAttribute('data-beneficio')] = input.value;
    });
    
    document.querySelectorAll('.cor-banco-input').forEach(input => {
        coresPersonalizadas.bancos[input.getAttribute('data-banco')] = input.value;
    });
    
    salvarCoresPersonalizadas();
    aplicarCoresSalvas();
    mostrarFeedback("✅ Cores salvas com sucesso!");
    setTimeout(() => fecharTelaCores(), 1000);
});

const btnCancelarCores = document.querySelector('#formCores .btn-cancelar');
if(btnCancelarCores) btnCancelarCores.addEventListener('click', (e) => { e.preventDefault(); fecharTelaCores(); });

// Evento do botão de aplicar filtro dos gráficos
document.getElementById("btnAplicarFiltroGrafico")?.addEventListener("click", aplicarFiltroGrafico);

function toggleFiltros() { toggleFiltro('filtrosContainer', 'iconeFiltro'); }
function toggleFiltrosFatura() { toggleFiltro('filtrosFaturaContent', 'iconeFiltroFatura'); }
function toggleFiltrosBeneficio() { toggleFiltro('filtrosBeneficioContent', 'iconeFiltroBeneficio'); }
function toggleFiltro(containerId, iconeId) {
    const c = document.getElementById(containerId);
    const i = document.getElementById(iconeId);
    if(c && i) { if(c.classList.contains('fechado')) { c.classList.remove('fechado'); i.textContent = '▼'; } else { c.classList.add('fechado'); i.textContent = '▶'; } }
}

function atualizarTabela() {
    if(!lista) return;
    lista.innerHTML = "";
    let dados = [...principal];
    const bancosSel = getSelecionados("filtroBanco");
    const tiposSel = getSelecionados("filtroTipo");
    const modalidadesSel = getSelecionados("filtroModalidade");
    if(bancosSel.length) dados = dados.filter(i => bancosSel.includes(i.banco));
    if(tiposSel.length) dados = dados.filter(i => tiposSel.includes(i.tipo));
    if(modalidadesSel.length) dados = dados.filter(i => modalidadesSel.includes(i.modalidade));
    dados.sort((a,b) => new Date(b.data) - new Date(a.data));
    document.getElementById("contadorResultados").textContent = `${dados.length} registro(s)`;
    if(!dados.length) { lista.innerHTML = `<tr><td colspan="7">Nenhum registro</td>`; atualizarResumo(); atualizarBeneficiosDinamico(); atualizarFatura(); atualizarGraficos(); atualizarMeta(); atualizarOrcamentos(); return; }
    dados.forEach(item => {
        const row = lista.insertRow();
        const cor = item.tipo === 'entrada' ? '#00b09b' : '#ff416c';
        row.innerHTML = `<td>${item.descricao}</td><td>${formatarMoeda(item.valor)}</td><td style="color:${cor};font-weight:bold">${item.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td><td>${item.modalidade}</td><td>${item.banco || "-"}</td><td>${item.data}</td><td class="acao-botoes"><button class="editar-btn" onclick="editarItem(${item.id})">✏️ Editar</button><button class="excluir-btn" onclick="remover(${item.id})">🗑️ Excluir</button></td>`;
    });
    atualizarResumo();
    atualizarBeneficiosDinamico();
    atualizarFatura();
    atualizarGraficos();
    atualizarMeta();
    atualizarOrcamentos();
}

function atualizarResumo() {
    let entrada = 0, saida = 0;
    principal.forEach(i => { 
        if(!configUsuario.beneficios.includes(i.modalidade)) { 
            if(i.tipo === "entrada") entrada += i.valor; 
            else if(i.tipo === "saida" && i.modalidade !== "Crédito") saida += i.valor; 
        } 
    });
    totalEntrada.textContent = formatarMoeda(entrada);
    totalSaida.textContent = formatarMoeda(saida);
    saldoFinal.textContent = formatarMoeda(entrada - saida);
}

window.filtrarBeneficio = function(beneficio) {
    beneficioSelecionado = beneficio;
    transacoesOriginais = principal.filter(i => i.modalidade === beneficio).sort((a,b) => new Date(b.data) - new Date(a.data));
    document.getElementById("beneficioFiltroAtivo").innerHTML = `📊 ${beneficio} - ${transacoesOriginais.length} transações`;
    limparFiltrosBeneficio();
    atualizarTabelaBeneficio(transacoesOriginais);
};

function aplicarFiltrosBeneficio() {
    if(!beneficioSelecionado) return alert("Clique em um benefício primeiro!");
    let dados = [...transacoesOriginais];
    const inicio = document.getElementById("filtroBeneficioDataInicio").value;
    if(inicio) dados = dados.filter(i => i.data >= inicio);
    const fim = document.getElementById("filtroBeneficioDataFim").value;
    if(fim) dados = dados.filter(i => i.data <= fim);
    const min = parseFloat(document.getElementById("filtroBeneficioValorMin").value);
    if(min) dados = dados.filter(i => i.valor >= min);
    const max = parseFloat(document.getElementById("filtroBeneficioValorMax").value);
    if(max) dados = dados.filter(i => i.valor <= max);
    const busca = document.getElementById("filtroBeneficioDescricao").value.toLowerCase();
    if(busca) dados = dados.filter(i => i.descricao.toLowerCase().includes(busca));
    const tipoFiltro = document.getElementById("filtroBeneficioTipo").value;
    if(tipoFiltro !== "todos") dados = dados.filter(i => i.tipo === tipoFiltro);
    const ordenar = document.getElementById("filtroBeneficioOrdenar").value;
    if(ordenar === 'data_desc') dados.sort((a,b) => new Date(b.data) - new Date(a.data));
    if(ordenar === 'data_asc') dados.sort((a,b) => new Date(a.data) - new Date(b.data));
    if(ordenar === 'valor_desc') dados.sort((a,b) => b.valor - a.valor);
    if(ordenar === 'valor_asc') dados.sort((a,b) => a.valor - b.valor);
    atualizarTabelaBeneficio(dados);
}

function limparFiltrosBeneficio() {
    document.getElementById("filtroBeneficioDataInicio").value = "";
    document.getElementById("filtroBeneficioDataFim").value = "";
    document.getElementById("filtroBeneficioValorMin").value = "";
    document.getElementById("filtroBeneficioValorMax").value = "";
    document.getElementById("filtroBeneficioDescricao").value = "";
    document.getElementById("filtroBeneficioTipo").value = "todos";
    document.getElementById("filtroBeneficioOrdenar").value = "data_desc";
    if(beneficioSelecionado && transacoesOriginais.length) atualizarTabelaBeneficio(transacoesOriginais);
}

function atualizarTabelaBeneficio(transacoes) {
    if(!listaBeneficioFiltrado) return;
    listaBeneficioFiltrado.innerHTML = "";
    if(!transacoes.length) { listaBeneficioFiltrado.innerHTML = `<tr><td colspan="4">Nenhuma transação</td>`; return; }
    transacoes.forEach(i => {
        const row = listaBeneficioFiltrado.insertRow();
        const cor = i.tipo === 'entrada' ? '#00b09b' : '#ff416c';
        row.innerHTML = `<td>${i.descricao}</td><td>${formatarMoeda(i.valor)}</td><td style="color:${cor}">${i.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td><td>${i.data}</td>`;
    });
}

window.filtrarBancoCredito = function(bancoNome) {
    bancoSelecionadoFatura = bancoNome;
    comprasOriginais = principal.filter(i => i.modalidade === "Crédito" && i.tipo === "saida" && i.banco === bancoNome).sort((a,b) => new Date(b.data) - new Date(a.data));
    document.getElementById("tituloFaturaFiltro").innerHTML = `💳 ${bancoNome}`;
    document.getElementById("filtroBancoAtivo").innerHTML = `📊 ${comprasOriginais.length} compras`;
    limparFiltrosFatura();
    atualizarTabelaFatura(comprasOriginais);
};

function aplicarFiltrosFatura() {
    if(!bancoSelecionadoFatura) return alert("Clique em um banco primeiro!");
    let dados = [...comprasOriginais];
    const inicio = document.getElementById("filtroDataInicio").value;
    if(inicio) dados = dados.filter(i => i.data >= inicio);
    const fim = document.getElementById("filtroDataFim").value;
    if(fim) dados = dados.filter(i => i.data <= fim);
    const min = parseFloat(document.getElementById("filtroValorMin").value);
    if(min) dados = dados.filter(i => i.valor >= min);
    const max = parseFloat(document.getElementById("filtroValorMax").value);
    if(max) dados = dados.filter(i => i.valor <= max);
    const busca = document.getElementById("filtroDescricao").value.toLowerCase();
    if(busca) dados = dados.filter(i => i.descricao.toLowerCase().includes(busca));
    const ordenar = document.getElementById("filtroOrdenar").value;
    if(ordenar === 'data_desc') dados.sort((a,b) => new Date(b.data) - new Date(a.data));
    if(ordenar === 'data_asc') dados.sort((a,b) => new Date(a.data) - new Date(b.data));
    if(ordenar === 'valor_desc') dados.sort((a,b) => b.valor - a.valor);
    if(ordenar === 'valor_asc') dados.sort((a,b) => a.valor - b.valor);
    atualizarTabelaFatura(dados);
}

function limparFiltrosFatura() {
    document.getElementById("filtroDataInicio").value = "";
    document.getElementById("filtroDataFim").value = "";
    document.getElementById("filtroValorMin").value = "";
    document.getElementById("filtroValorMax").value = "";
    document.getElementById("filtroDescricao").value = "";
    document.getElementById("filtroOrdenar").value = "data_desc";
    if(bancoSelecionadoFatura && comprasOriginais.length) atualizarTabelaFatura(comprasOriginais);
}

function atualizarTabelaFatura(compras) {
    if(!listaFatura) return;
    listaFatura.innerHTML = "";
    if(!compras.length) { listaFatura.innerHTML = `<td><td colspan="5">Nenhuma compra</td>`; return; }
    compras.forEach(i => {
        const row = listaFatura.insertRow();
        row.innerHTML = `<td>${i.descricao}</td><td style="color:#ff416c">${formatarMoeda(i.valor)}</td><td>${i.banco}</td><td>${i.data}</td><td>Crédito</td>`;
    });
}

form.onsubmit = e => {
    e.preventDefault();
    if(!descricao.value || !valor.value || !tipo.value || !modalidade.value || !data.value) return alert("Preencha todos os campos!");
    principal.push({ id: Date.now(), descricao: descricao.value, valor: parseFloat(valor.value), tipo: tipo.value, modalidade: modalidade.value, banco: banco.value || "", data: data.value });
    localStorage.setItem("principal", JSON.stringify(principal));
    const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    if(user) localStorage.setItem(`dados_${user.id}`, JSON.stringify(principal));
    form.reset();
    atualizarTabela();
};

window.editarItem = function(id) { abrirModal(id); };
window.remover = function(id) { if(confirm("Excluir?")) { principal = principal.filter(i => i.id !== id); localStorage.setItem("principal", JSON.stringify(principal)); const user = JSON.parse(sessionStorage.getItem("usuarioLogado")); if(user) localStorage.setItem(`dados_${user.id}`, JSON.stringify(principal)); atualizarTabela(); } };

function abrirModal(id) {
    const item = principal.find(i => i.id === id);
    if(!item) return;
    document.getElementById("editarId").value = item.id;
    document.getElementById("editarDescricao").value = item.descricao;
    document.getElementById("editarValor").value = item.valor;
    document.getElementById("editarTipo").value = item.tipo;
    document.getElementById("editarBanco").value = item.banco || "";
    document.getElementById("editarModalidade").value = item.modalidade;
    document.getElementById("editarData").value = item.data;
    modal.style.display = "block";
}

function fecharModalFunc() { modal.style.display = "none"; formEditar.reset(); }
if(fecharModal) fecharModal.onclick = fecharModalFunc;
if(btnCancelar) btnCancelar.onclick = fecharModalFunc;
window.onclick = function(e) { if(e.target === modal) fecharModalFunc(); };

formEditar.onsubmit = e => {
    e.preventDefault();
    const id = parseInt(document.getElementById("editarId").value);
    const index = principal.findIndex(i => i.id === id);
    if(index !== -1) {
        principal[index] = { id, descricao: document.getElementById("editarDescricao").value, valor: parseFloat(document.getElementById("editarValor").value), tipo: document.getElementById("editarTipo").value, modalidade: document.getElementById("editarModalidade").value, banco: document.getElementById("editarBanco").value || "", data: document.getElementById("editarData").value };
        localStorage.setItem("principal", JSON.stringify(principal));
        const user = JSON.parse(sessionStorage.getItem("usuarioLogado"));
        if(user) localStorage.setItem(`dados_${user.id}`, JSON.stringify(principal));
        atualizarTabela();
        fecharModalFunc();
    }
};

window.trocarAba = function(aba) {
    document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
    document.querySelectorAll(".abas button").forEach(b => b.classList.remove("active"));
    document.getElementById("aba" + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add("ativa");
    document.getElementById("btn" + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add("active");
    if(aba === "graficos") setTimeout(() => atualizarGraficos(), 100);
    if(aba === "metas") { atualizarMeta(); atualizarOrcamentos(); }
    if(aba === "parcelas") carregarParcelas();
    if(aba === "recorrentes") carregarRecorrentes();
};

document.getElementById("btnAplicarFiltro").onclick = atualizarTabela;
document.getElementById("btnLimparFiltro").onclick = () => { document.querySelectorAll("#filtroBanco input, #filtroModalidade input, #filtroTipo input").forEach(i => i.checked = false); atualizarTabela(); };
document.getElementById("btnAplicarFiltroBeneficio").onclick = aplicarFiltrosBeneficio;
document.getElementById("btnLimparFiltroBeneficio").onclick = limparFiltrosBeneficio;
document.getElementById("btnAplicarFiltroFatura").onclick = aplicarFiltrosFatura;
document.getElementById("btnLimparFiltroFatura").onclick = limparFiltrosFatura;

document.addEventListener("DOMContentLoaded", () => { verificarLogin(); });