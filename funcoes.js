/**
 * Calculadora de Comanda — camada de interface.
 *
 * Guarda o estado (clientes, produtos e consumo), desenha as tabelas
 * e chama as regras puras de logica.js.
 */

(function ()
{
    "use strict";

    var clientes = [];
    var produtos = [];
    var consumo = {};
    var proximoCliente = 0;
    var proximoProduto = 0;

    var campoNomeCliente = document.getElementById("nomeCliente");
    var campoTarifa = document.getElementById("tarifa");
    var campoNomeProduto = document.getElementById("nomeProduto");
    var campoPrecoProduto = document.getElementById("precoProduto");
    var campoQuantidadeProduto = document.getElementById("quantidadeProduto");

    var tabelaClientes = document.querySelector("#clientes_cadastrados tbody");
    var tabelaProdutos = document.querySelector("#produtos_cadastrados tbody");
    var vazioClientes = document.getElementById("vazio-clientes");
    var vazioProdutos = document.getElementById("vazio-produtos");

    var avisoCliente = document.getElementById("aviso-cliente");
    var avisoProduto = document.getElementById("aviso-produto");
    var avisoCalculo = document.getElementById("aviso-calculo");
    var notasFiscais = document.getElementById("notas_fiscais");

    /** Escapa texto digitado antes de entrar no HTML. */
    function escaparHtml(texto)
    {
        return String(texto == null ? "" : texto)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** Mostra (ou limpa) a mensagem de um aviso. */
    function avisar(elemento, mensagem, tipo)
    {
        if (!elemento)
        {
            return;
        }

        elemento.textContent = mensagem || "";
        elemento.hidden = !mensagem;
        elemento.classList.toggle("aviso--erro", tipo === "erro");
        elemento.classList.toggle("aviso--atencao", tipo === "atencao");
        elemento.classList.toggle("aviso--ok", tipo === "ok");
    }

    function existeCliente(id)
    {
        return clientes.some(function (cliente)
        {
            return cliente.id === id;
        });
    }

    function criarNovoCliente()
    {
        var erro = LogicaComanda.validarNovoCliente(campoNomeCliente.value);

        if (erro)
        {
            avisar(avisoCliente, erro, "erro");
            campoNomeCliente.focus();
            return;
        }

        proximoCliente += 1;

        clientes.push(
        {
            id: proximoCliente,
            nome: campoNomeCliente.value.trim(),
            tarifa: campoTarifa.checked
        });

        campoNomeCliente.value = "";
        campoTarifa.checked = false;

        avisar(avisoCliente, "Cliente adicionado.", "ok");
        atualizarListaClientes();
        atualizarListaProdutos();
        campoNomeCliente.focus();
    }

    function criarNovoProduto()
    {
        var preco = LogicaComanda.converterNumero(campoPrecoProduto.value);
        var quantidade = Number(campoQuantidadeProduto.value.trim());

        var erro = LogicaComanda.validarNovoProduto(campoNomeProduto.value, preco, quantidade);

        if (erro)
        {
            avisar(avisoProduto, erro, "erro");
            return;
        }

        proximoProduto += 1;

        produtos.push(
        {
            id: proximoProduto,
            nome: campoNomeProduto.value.trim(),
            preco: preco,
            quantidade: quantidade
        });

        campoNomeProduto.value = "";
        campoPrecoProduto.value = "";
        campoQuantidadeProduto.value = "";

        avisar(avisoProduto, "Produto adicionado.", "ok");
        atualizarListaProdutos();
        campoNomeProduto.focus();
    }

    function atualizarListaClientes()
    {
        vazioClientes.hidden = clientes.length > 0;

        var linhas = clientes.map(function (cliente)
        {
            var selo = cliente.tarifa
                ? "<span class=\"selo selo--tarifa\">" + LogicaComanda.TARIFA_PERCENTUAL + "%</span>"
                : "<span class=\"texto-sutil\">—</span>";

            return "<tr>" +
                "<td class=\"celula--id rf-code\">" + escaparHtml(cliente.id) + "</td>" +
                "<td>" + escaparHtml(cliente.nome) + "</td>" +
                "<td>" + selo + "</td>" +
                "</tr>";
        });

        tabelaClientes.innerHTML = linhas.join("");
    }

    function atualizarListaProdutos()
    {
        vazioProdutos.hidden = produtos.length > 0;

        var linhas = produtos.map(function (produto)
        {
            var marcados = consumo[produto.id] || [];

            var consumidores;
            if (clientes.length === 0)
            {
                consumidores = "<span class=\"texto-sutil\">Cadastre clientes para marcar</span>";
            }
            else
            {
                consumidores = clientes.map(function (cliente)
                {
                    var marcado = marcados.indexOf(cliente.id) >= 0 ? " checked" : "";

                    return "<label class=\"opcao-consumo\">" +
                        "<input type=\"checkbox\" data-produto=\"" + escaparHtml(produto.id) + "\" value=\"" + escaparHtml(cliente.id) + "\"" + marcado + ">" +
                        "<span>" + escaparHtml(cliente.nome) + "</span>" +
                        "</label>";
                }).join("");
            }

            return "<tr>" +
                "<td class=\"celula--id rf-code\">" + escaparHtml(produto.id) + "</td>" +
                "<td>" + escaparHtml(produto.nome) + "</td>" +
                "<td class=\"celula--valor rf-code\">" + escaparHtml(LogicaComanda.formatarMoeda(produto.preco)) + "</td>" +
                "<td class=\"celula--num rf-code\">" + escaparHtml(produto.quantidade) + "</td>" +
                "<td><div class=\"consumidores\">" + consumidores + "</div></td>" +
                "</tr>";
        });

        tabelaProdutos.innerHTML = linhas.join("");
    }

    function renderizarNotas(notas)
    {
        var cartoes = notas.map(function (nota)
        {
            var selo = nota.tarifa
                ? "<span class=\"selo selo--tarifa\">Tarifa " + LogicaComanda.TARIFA_PERCENTUAL + "%</span>"
                : "";

            var linhas = nota.itens.map(function (item)
            {
                return "<tr>" +
                    "<td>" + escaparHtml(item.descricao) + "</td>" +
                    "<td class=\"celula--valor rf-code\">" + escaparHtml(LogicaComanda.formatarMoeda(item.valor)) + "</td>" +
                    "</tr>";
            }).join("");

            if (!linhas)
            {
                linhas = "<tr><td class=\"texto-sutil\" colspan=\"2\">Nenhum consumo marcado</td></tr>";
            }

            var linhaTarifa = nota.tarifa
                ? "<tr class=\"nota__linha--tarifa\">" +
                    "<td>Tarifa (" + LogicaComanda.TARIFA_PERCENTUAL + "%)</td>" +
                    "<td class=\"celula--valor rf-code\">" + escaparHtml(LogicaComanda.formatarMoeda(nota.tarifaValor)) + "</td>" +
                    "</tr>"
                : "";

            return "<article class=\"nota rf-content-panel\">" +
                "<header class=\"nota__cabecalho\">" +
                    "<h3 class=\"rf-label\">" + escaparHtml(nota.nome) + "</h3>" +
                    selo +
                "</header>" +
                "<table class=\"nota__tabela\">" +
                    "<tbody>" + linhas + linhaTarifa + "</tbody>" +
                    "<tfoot>" +
                        "<tr>" +
                            "<td>Total</td>" +
                            "<td class=\"celula--valor rf-code\">" + escaparHtml(LogicaComanda.formatarMoeda(nota.total)) + "</td>" +
                        "</tr>" +
                    "</tfoot>" +
                "</table>" +
                "</article>";
        });

        notasFiscais.innerHTML = cartoes.join("");
    }

    function calcularComanda()
    {
        if (clientes.length === 0)
        {
            avisar(avisoCalculo, "Cadastre pelo menos um cliente.", "erro");
            return;
        }

        if (produtos.length === 0)
        {
            avisar(avisoCalculo, "Cadastre pelo menos um produto.", "erro");
            return;
        }

        var semConsumidor = produtos.filter(function (produto)
        {
            var marcados = consumo[produto.id] || [];

            return !marcados.some(function (id)
            {
                return existeCliente(id);
            });
        }).map(function (produto)
        {
            return produto.nome;
        });

        if (semConsumidor.length === produtos.length)
        {
            avisar(avisoCalculo, "Marque quem consumiu pelo menos um produto.", "erro");
            return;
        }

        if (semConsumidor.length > 0)
        {
            avisar(avisoCalculo, "Sem consumidor marcado (ficou de fora): " + semConsumidor.join(", ") + ".", "atencao");
        }
        else
        {
            avisar(avisoCalculo, "", "");
        }

        renderizarNotas(LogicaComanda.ratearComanda(clientes, produtos, consumo));
    }

    function registrarConsumo(evento)
    {
        var caixa = evento.target;

        if (!caixa || caixa.type !== "checkbox")
        {
            return;
        }

        var produtoId = Number(caixa.getAttribute("data-produto"));
        var clienteId = Number(caixa.value);

        if (!produtoId || !clienteId)
        {
            return;
        }

        var marcados = consumo[produtoId] || [];
        var posicao = marcados.indexOf(clienteId);

        if (caixa.checked && posicao < 0)
        {
            marcados.push(clienteId);
        }
        else if (!caixa.checked && posicao >= 0)
        {
            marcados.splice(posicao, 1);
        }

        consumo[produtoId] = marcados;
    }

    function iniciarTema()
    {
        var botao = document.getElementById("botao-tema");

        function atualizarRotulo()
        {
            var escuro = document.documentElement.getAttribute("data-theme") !== "light";
            var rotulo = escuro ? "Ativar tema claro" : "Ativar tema escuro";

            botao.setAttribute("aria-label", rotulo);
            botao.setAttribute("title", rotulo);
        }

        botao.addEventListener("click", function ()
        {
            var novo = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";

            document.documentElement.setAttribute("data-theme", novo);

            try
            {
                localStorage.setItem("rafastos-theme", novo);
            }
            catch (erro)
            {
                /* armazenamento indisponível: segue só na sessão */
            }

            atualizarRotulo();
        });

        atualizarRotulo();
    }

    function aoPressionarEnter(evento, acao)
    {
        if (evento.key === "Enter")
        {
            evento.preventDefault();
            acao();
        }
    }

    document.getElementById("adicionarCliente").addEventListener("click", criarNovoCliente);
    document.getElementById("adicionarProduto").addEventListener("click", criarNovoProduto);
    document.getElementById("calcular").addEventListener("click", calcularComanda);
    document.getElementById("produtos_cadastrados").addEventListener("change", registrarConsumo);

    campoNomeCliente.addEventListener("keydown", function (evento)
    {
        aoPressionarEnter(evento, criarNovoCliente);
    });

    [campoNomeProduto, campoPrecoProduto, campoQuantidadeProduto].forEach(function (campo)
    {
        campo.addEventListener("keydown", function (evento)
        {
            aoPressionarEnter(evento, criarNovoProduto);
        });
    });

    vazioClientes.hidden = false;
    vazioProdutos.hidden = false;
    iniciarTema();
})();
