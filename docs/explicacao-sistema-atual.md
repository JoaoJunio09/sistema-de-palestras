# Explicacao do sistema atual de palestras

Arquivo analisado: `index.html`

Este documento explica como o sistema atual funciona antes da refatoracao para React. O projeto inteiro esta concentrado em um unico arquivo HTML, com CSS, estrutura visual, dados das palestras e JavaScript de regra de negocio no mesmo lugar.

Observacao importante: os textos acentuados aparecem no terminal como `InscriÃ§Ãµes`, `perÃ­odo`, etc. Isso indica um problema de codificacao/visualizacao de caracteres. Como o HTML declara `<meta charset="UTF-8">`, pode ser apenas o terminal exibindo incorretamente, mas tambem pode ser que o arquivo esteja salvo com encoding errado. Antes da refatoracao vale confirmar no navegador/editor.

## 1. Visao geral do fluxo

O sistema faz isto:

1. Carrega Tailwind CSS via CDN para estilizar a pagina.
2. Carrega jsPDF e jsPDF AutoTable via CDN para gerar PDF no navegador.
3. Carrega Firebase Auth e Firestore diretamente via CDN, usando `script type="module"`.
4. Inicializa o Firebase com as chaves do projeto `palestras-ac51e`.
5. Define manualmente, dentro do JavaScript, todas as palestras/oficinas organizadas por dia.
6. Espera o usuario escolher `Periodo Integral` ou `Periodo Noturno`.
7. Renderiza os cards das palestras do periodo escolhido.
8. Permite login com Google.
9. Preenche automaticamente nome/e-mail nos formularios depois do login.
10. Permite uma inscricao por aluno por dia, validando pelo e-mail e pelo dia.
11. Grava a inscricao no Firestore.
12. Escuta o Firestore em tempo real para atualizar quantidade de vagas e lista de inscritos.
13. Permite excluir todas as inscricoes do usuario logado.
14. Permite ver os inscritos de uma atividade.
15. Permite baixar PDF simples com os inscritos da atividade usando jsPDF no front-end.

## 2. Estrutura do arquivo

### Linhas 1 a 14: base HTML e dependencias

- Linha 1: `<!DOCTYPE html>` informa ao navegador que o arquivo usa HTML5.
- Linha 2: `<html lang="pt-BR">` define o idioma da pagina como portugues do Brasil.
- Linhas 3 a 14: cabecalho do documento.
- Linha 4: declara UTF-8 como codificacao esperada.
- Linha 5: torna a tela responsiva em celulares.
- Linha 6: define o titulo da aba do navegador.
- Linha 7: importa Tailwind via CDN. Isso permite usar classes como `bg-white`, `rounded-xl`, `text-gray-800` direto no HTML.
- Linhas 8 e 9: fazem preconexao com Google Fonts para melhorar carregamento da fonte.
- Linha 10: importa a fonte Inter.
- Linha 12: importa jsPDF para criar PDF no navegador.
- Linha 13: importa plugin AutoTable, usado para colocar tabelas no PDF.

### Linhas 15 a 93: CSS proprio

- Linha 15: abre o bloco `<style>`.
- Linha 16: aplica a fonte Inter ao `body` e cria transicao suave para cor de fundo/texto.
- Linhas 17 a 24: criam `.loader`, o circulo de carregamento.
- Linha 18: borda cinza do spinner.
- Linha 19: deixa o spinner circular.
- Linha 20: cria uma borda superior azul; isso gera o efeito visual quando gira.
- Linhas 21 e 22: definem tamanho de 32px.
- Linha 23: aplica animacao chamada `spin`.
- Linha 25: define a animacao `spin`, rotacionando de 0 a 360 graus.
- Linhas 27 a 29: adicionam transicao em botoes de abas e periodo.
- Linhas 30 a 34: estilo para botoes ativos. Observacao: o JS usa `periodo-filter-btn`, mas o CSS aqui fala em `.periodo-tab-btn`; esse nome nao bate, entao parte desse estilo pode nao afetar os botoes de periodo.
- Linhas 36 a 91: definem o modo escuro para o periodo noturno.
- Linhas 37 a 41: `.dark-mode` muda fundo e cor geral.
- Linhas 43 a 46: quando o modo escuro esta ativo, elementos com `bg-gray-100` ficam escuros. Observacao: o `body` atual nao tem `bg-gray-100`, entao isso pode ter pouco efeito.
- Linhas 49 a 57: deixa cards, fundos claros, inputs e selects escuros.
- Linhas 59 a 77: ajustam classes de texto cinza para tons claros no modo escuro.
- Linhas 79 a 82: altera bordas cinzas.
- Linhas 84 a 87: altera sombra no modo escuro.
- Linhas 88 a 91: classe `text-light` fica clara no modo escuro.
- Linha 93: fecha o CSS.

### Linhas 94 a 146: corpo visual da pagina

- Linha 95: abre o `body`, com texto cinza.
- Linha 96: cria um container centralizado, responsivo e com largura maxima.
- Linhas 97 a 111: cabecalho com titulo, dados do usuario e botoes de login/exclusao.
- Linha 98: titulo principal.
- Linha 99: container dos elementos de autenticacao.
- Linhas 100 a 103: area de usuario logado. Comeca escondida com `hidden`.
- Linha 101: recebe o nome do usuario via JavaScript.
- Linha 102: recebe o e-mail do usuario via JavaScript.
- Linhas 104 a 106: botao para excluir todas as inscricoes do usuario. Comeca escondido.
- Linhas 107 a 109: botao de login/logout. O texto muda pelo JavaScript.
- Linhas 113 a 123: card para selecionar periodo.
- Linha 116: botao de Periodo Integral.
- Linha 119: botao de Periodo Noturno.
- Linha 125: `main-content` com `hidden`; todo o conteudo principal fica invisivel ate selecionar periodo.
- Linhas 126 a 132: abas de dias.
- Linha 127: dia 1, Feira de Profissoes.
- Linha 128: dia 2, Palestras.
- Linha 129: dia 3, Oficinas noturnas, com `noturno-only hidden`.
- Linha 130: dia 4, Palestras.
- Linha 131: dia 5, Oficinas integrais, com `integral-only hidden`.
- Linhas 134 a 139: container onde os cards de palestras serao renderizados. Inicialmente mostra loader.
- Linhas 142 a 144: rodape.
- Linha 146: fim do container principal.

## 3. JavaScript e Firebase

### Linhas 147 a 164: imports e inicializacao

- Linha 147: abre um script ES Module. Isso permite usar `import`.
- Linha 148: importa `initializeApp`, usado para iniciar o app Firebase.
- Linha 149: importa recursos de autenticacao:
  - `getAuth`: cria/acessa o servico de autenticacao.
  - `GoogleAuthProvider`: configura login via Google.
  - `signInWithPopup`: abre popup de login.
  - `signOut`: desloga.
  - `onAuthStateChanged`: observa mudancas de login/logout.
- Linha 150: importa recursos do Firestore:
  - `getFirestore`: acessa banco.
  - `collection`: referencia uma colecao.
  - `addDoc`: adiciona documento.
  - `query`, `where`: montam filtros.
  - `getDocs`: busca dados uma vez.
  - `onSnapshot`: escuta dados em tempo real.
  - `serverTimestamp`: salva data/hora do servidor.
  - `doc`, `deleteDoc`: referenciam e deletam documentos.
- Linhas 152 a 159: configuracao publica do Firebase.
- Linha 160: inicializa o Firebase.
- Linha 161: instancia Firebase Auth.
- Linha 162: instancia Firestore.
- Linha 163: cria provedor Google.
- Linha 164: cria referencia para a colecao de inscricoes.

Ponto de atencao: a colecao esta em `artifacts/default-lecture-app/public/data/registrations`. Esse caminho parece ter vindo de template/IA. Em uma refatoracao, eu sugiro trocar para algo mais claro, como `registrations`, `events/{eventId}/registrations`, ou `academicWeeks/{year}/registrations`.

### Linhas 166 a 233: catalogo fixo de palestras

`lecturesByDay` e um array de objetos. Cada objeto representa um dia:

```js
{
  day: 1,
  lectures: [...]
}
```

Cada palestra/oficina tem:

- `id`: identificador usado no DOM, no Firestore e para montar chaves internas.
- `title`: titulo exibido no card e no PDF.
- `periodo`: `Integral` ou `Noturno`.
- `description`: HTML com horario, local e palestrante.

Dias configurados:

- Dia 1: Feira de Profissoes, com opcoes Integral e Noturno.
- Dia 2: Palestras, com opcoes Integral e Noturno.
- Dia 3: Oficinas do Noturno.
- Dia 4: Palestras, com opcoes Integral e Noturno.
- Dia 5: Oficinas do Integral.

Pontos de atencao:

- Os dados estao hardcoded no front-end. Para um sistema novo, o ideal e administrar isso pelo Firestore ou por uma tela administrativa.
- `description` contem HTML em string. Isso funciona, mas mistura dado com marcacao visual.
- Alguns IDs usam letras maiusculas, acentos ou padroes diferentes (`Direito-dia1`, `Inf-e-com-noturno-dia2`, `comunicaçao-dia2`). Isso pode dificultar filtros e URLs depois.
- O campo `periodo` da palestra e o campo `periodo` do aluno tem o mesmo nome, mas significam coisas levemente diferentes: periodo da atividade vs periodo informado pelo estudante.

### Linhas 235 a 249: estado global e referencias do DOM

- Linha 235: `TOTAL_SPOTS = 40`; cada atividade tem 40 vagas.
- Linha 236: `allRegistrations = {}` guarda no navegador a lista atual de inscritos por atividade.
- Linha 237: `selectedPeriodoFilter = null`; inicialmente nenhum periodo foi escolhido.
- Linha 238: `isFirstLoad = true`; variavel declarada, mas nao usada em nenhum lugar. Pode ser removida.
- Linhas 240 a 249: pegam elementos do HTML pelo `id`, para o JS manipular depois:
  - `authButton`: botao login/sair.
  - `userInfoDiv`: area de nome/e-mail.
  - `userNameP`: paragrafo do nome.
  - `userEmailP`: paragrafo do e-mail.
  - `lecturesContainer`: onde os cards entram.
  - `deleteMyRegistrationsButton`: botao vermelho.
  - `tabsContainer`: abas de dias.
  - `filterIntegralBtn`: botao integral.
  - `filterNoturnoBtn`: botao noturno.
  - `mainContent`: area principal escondida.

### Linha 251: observador de autenticacao

```js
onAuthStateChanged(auth, user => updateUIForAuthState(user));
```

Quando o usuario loga ou sai, o Firebase chama essa funcao. Ela passa o objeto `user` se estiver logado, ou `null` se nao estiver.

### Linhas 253 a 271: `updateUIForAuthState(user)`

Essa funcao sincroniza a interface com o estado de login.

Quando ha usuario:

- Linha 255: mostra nome ou `Usuario`.
- Linha 256: mostra e-mail.
- Linha 257: exibe a area de usuario.
- Linha 258: exibe botao de excluir inscricoes.
- Linha 259: troca texto do botao para `Sair`.
- Linha 260: troca o comportamento do botao para `signOut(auth)`.
- Linhas 261 e 262: preenche todos os campos de e-mail e nome dos formularios renderizados.

Quando nao ha usuario:

- Linha 264: esconde dados do usuario.
- Linha 265: esconde botao de exclusao.
- Linha 266: volta texto para `Login com Google`.
- Linha 267: configura botao para abrir login Google.
- Linhas 268 e 269: limpa campos de nome/e-mail nos formularios.

Ponto de atencao: alem de usar `onclick` aqui, o codigo tambem adiciona `addEventListener` no mesmo botao na linha 530. Isso duplica responsabilidades e pode gerar comportamento confuso. Em React, essa logica deve ficar em um unico handler.

### Linhas 273 a 358: `renderLectures()`

Essa e a funcao que desenha os cards das palestras na tela.

- Linha 274: limpa tudo dentro do container.
- Linha 275: percorre todos os dias de `lecturesByDay`.
- Linhas 277 a 279: se o periodo for Integral, ignora o dia 3, porque dia 3 e so Noturno.
- Linhas 281 a 283: se o periodo for Noturno, ignora o dia 5, porque dia 5 e so Integral.
- Linhas 285 a 287: cria a `div` que agrupa os cards de um dia.
- Linha 286: define id como `day-content-1`, `day-content-2`, etc.
- Linha 288: todos os dias diferentes do dia 1 comecam escondidos.
- Linhas 290 a 291: se nao houver palestras no dia, mostra mensagem vazia.
- Linha 294: filtra as palestras pelo periodo selecionado.
- Linhas 296 a 300: se nao sobrou palestra apos o filtro, mostra mensagem.
- Linhas 302 a 305: cria cabecalho indicando o periodo exibido.
- Linha 306: percorre cada palestra filtrada.
- Linha 307: monta uma chave unica como `dia1-medicina-dia1`.
- Linhas 308 a 311: cria o card da palestra, com classes Tailwind e `data-periodo`.
- Linhas 313 a 351: montam o HTML interno do card usando template string.

Dentro do card:

- Linhas 314 a 327: titulo, selo de periodo, botao de detalhes, contador de vagas e status.
- Linha 317: exibe titulo da atividade.
- Linha 318: exibe selo Integral/Noturno.
- Linha 321: botao `Ver Detalhes`.
- Linha 322: descricao escondida, com HTML vindo de `lecture.description`.
- Linha 324: contador `Vagas Preenchidas: 0 / 40`.
- Linha 326: status inicial `Aguardando...`.
- Linhas 329 a 345: formulario de inscricao.
- Linha 329: form recebe `data-lecture-id` e `data-day`.
- Linha 332: input nome.
- Linha 333: input e-mail.
- Linha 336: select serie.
- Linha 337: select curso.
- Linha 338: select periodo do aluno.
- Linha 341: botao de confirmar inscricao.
- Linha 342: botao para ver inscritos.
- Linha 343: botao para baixar PDF.
- Linha 346: area de mensagens.
- Linhas 347 a 350: lista escondida de inscritos.
- Linha 352: adiciona card ao container do dia.
- Linha 355: adiciona container do dia ao container principal.
- Linha 357: chama `updateUIForAuthState(auth.currentUser)` para preencher nome/e-mail se o usuario ja estiver logado.

Pontos de atencao:

- A funcao manipula DOM manualmente. Em React, isso vira componentes e estado.
- `innerHTML` injeta strings HTML. Se algum dado vier de usuario/banco no futuro, pode abrir risco de XSS.
- O dia ativo sempre tende a ser o dia 1, mesmo quando o filtro muda.
- O formulario existe repetido em cada card, entao o aluno pode se inscrever em qualquer palestra visivel.

### Linhas 360 a 365: `handleTabClick(event)`

Essa funcao controla as abas dos dias.

- Linha 361: se o clique nao foi em `.tab-btn`, ignora.
- Linha 362: le o dia pelo `data-day`.
- Linha 363: marca como ativa apenas a aba clicada.
- Linha 364: mostra apenas o conteudo do dia escolhido e esconde os demais.

### Linhas 367 a 415: `handlePeriodoFilterClick(event)`

Essa funcao roda quando o usuario escolhe Integral ou Noturno.

- Linha 368: verifica se o botao clicado foi o de Integral.
- Linha 369: define `selectedPeriodoFilter` como `Integral` ou `Noturno`.
- Linhas 372 a 376: remove ou adiciona `dark-mode` no `body`. Noturno ativa modo escuro.
- Linha 379: exibe o conteudo principal.
- Linhas 382 e 383: alterna classe `active` nos botoes de periodo.
- Linhas 385 a 395: altera manualmente classes Tailwind para destacar o botao escolhido.
- Linhas 398 a 403: mostra/esconde abas exclusivas:
  - `.integral-only`: aparece so para Integral.
  - `.noturno-only`: aparece so para Noturno.
- Linhas 406 a 409: clica automaticamente na primeira aba visivel.
- Linha 412: renderiza as palestras do periodo escolhido.
- Linha 413: inicia escuta em tempo real das inscricoes.

Ponto critico: toda vez que troca periodo, `listenToRegistrations()` e chamada de novo. Como `onSnapshot` cria um listener continuo e o codigo nao guarda/cancela o listener anterior, podem ficar varios listeners ativos ao mesmo tempo. Isso e desperdicio e pode causar atualizacoes duplicadas.

Outro ponto: o codigo clica na aba antes de renderizar. Como `renderLectures()` limpa e recria conteudo depois, parte da troca de aba pode acontecer em elementos antigos. Na pratica pode funcionar por acaso, mas a ordem ideal seria renderizar primeiro e depois ativar a aba correta.

### Linhas 417 a 455: `handleRegistration(event)`

Essa e a funcao principal de inscricao.

- Linha 418: impede o envio tradicional do form/reload da pagina.
- Linha 419: pega usuario logado.
- Linha 420: se nao estiver logado, exibe mensagem e para.
- Linha 421: pega `lectureId` e `day` do `dataset` do form.
- Linha 422: monta a chave unica da atividade.
- Linhas 423 a 427: coleta valores dos inputs/selects.
- Linha 423: nome, com `trim()`.
- Linha 424: e-mail, com `trim()` e `toLowerCase()`.
- Linha 425: serie.
- Linha 426: curso.
- Linha 427: periodo informado pelo aluno.
- Linha 428: pega botao submit para desabilitar durante processamento.
- Linha 429: localiza os dados da palestra no array `lecturesByDay`.
- Linhas 430 a 433: impede inscricao se periodo do aluno for diferente do periodo da palestra.
- Linhas 434 a 437: valida campos obrigatorios.
- Linha 438: desabilita botao e troca texto para `Processando...`.
- Linha 440: monta consulta no Firestore procurando inscricao do mesmo e-mail no mesmo dia.
- Linha 441: executa a consulta.
- Linhas 442 a 445: se ja existe inscricao naquele dia, exibe aviso e joga erro `"duplicado"`.
- Linha 446: grava a inscricao no Firestore.
- Linha 447: mostra sucesso.
- Linha 448: reseta o formulario.
- Linha 449: preenche novamente nome/e-mail do usuario logado.
- Linhas 450 a 452: mostra erro generico, exceto no caso de duplicidade.
- Linhas 452 a 454: reabilita botao e restaura texto.

Documento salvo no Firestore:

```js
{
  lectureId,
  day,
  studentName: name,
  studentEmail: email,
  serie,
  curso,
  periodo,
  registeredAt: serverTimestamp(),
  userId: user.uid
}
```

Pontos de atencao:

- Nao ha validacao transacional de vagas. Se duas pessoas se inscreverem ao mesmo tempo na ultima vaga, o front-end pode permitir passar de 40.
- A regra "uma atividade por dia" depende de consulta client-side. Isso precisa ser reforcado em backend ou regras do Firestore.
- A exclusao usa o e-mail do login, mas a inscricao usa o e-mail digitado. Se o usuario alterar o campo antes de inscrever, depois talvez nao consiga excluir pelo proprio login.
- O sistema permite que o usuario logado preencha outro e-mail manualmente.

### Linhas 457 a 475: `handleDeleteMyRegistrations()`

Exclui todas as inscricoes do usuario logado.

- Linha 458: pega usuario atual.
- Linha 459: se nao estiver logado, alerta e para.
- Linha 460: pede confirmacao.
- Linha 461: desabilita o botao e troca texto.
- Linha 463: consulta inscricoes cujo `studentEmail` e igual ao e-mail do usuario logado.
- Linha 464: busca os documentos.
- Linha 465: se nao encontrar, alerta.
- Linha 466: cria uma lista de promessas para deletar cada documento.
- Linha 467: espera todas as delecoes.
- Linha 468: alerta sucesso.
- Linha 470: loga erro no console.
- Linha 471: alerta erro.
- Linha 473: reabilita botao e restaura texto.

Ponto de atencao: dentro da funcao e usado `this`. Como ela foi registrada diretamente no botao com `addEventListener`, hoje `this` tende a ser o botao. Mas esse padrao e fragil e em React nao existira desse jeito.

### Linhas 477 a 483: `displayMessage(uniqueIdPrefix, text, color)`

Mostra mensagens abaixo do formulario.

- Linha 478: localiza a div `message-diaX-id`.
- Linha 479: mapa de cores permitidas.
- Linha 480: coloca o texto.
- Linha 481: troca a classe para aplicar cor.
- Linha 482: depois de 5 segundos limpa o texto.

Ponto de atencao: se `el` nao existir, a funcao quebrara. Hoje normalmente existe porque o formulario foi renderizado.

### Linhas 485 a 523: `listenToRegistrations()`

Escuta o Firestore em tempo real e atualiza contagens/listas.

- Linha 486: cria listener `onSnapshot` na colecao de inscricoes.
- Linha 487: cria objetos temporarios `counts` e `registrations`.
- Linhas 488 a 492: inicializa todas as atividades com contagem 0 e lista vazia.
- Linha 494: percorre cada documento vindo do Firestore.
- Linha 495: pega dados do documento.
- Linha 496: monta a chave da atividade usando `day` e `lectureId`.
- Linha 497: verifica se a chave existe no catalogo local.
- Linha 498: incrementa contador.
- Linha 499: adiciona aluno na lista local.
- Linha 503: atualiza variavel global `allRegistrations`.
- Linhas 505 a 521: percorre todas as palestras e atualiza DOM.
- Linha 507: pega contador na tela.
- Linha 509: troca texto do contador.
- Linha 510: pega elemento de status.
- Linha 511: pega formulario.
- Linha 512: pega botao submit.
- Linhas 513 a 516: se lotou, mostra `Vagas Esgotadas` e desabilita botao.
- Linhas 516 a 519: se ha vaga, mostra `Vagas Disponiveis` e habilita botao.

Pontos criticos:

- Como dito, essa funcao pode ser chamada varias vezes, criando varios listeners.
- Ela baixa todas as inscricoes da colecao, nao apenas do evento/ano/periodo atual.
- O limite de 40 e visual, nao uma garantia de banco.
- A lista `allRegistrations` so existe em memoria. Ao recarregar, ela e reconstruida pelo snapshot.

### Linhas 525 a 571: `setupEventListeners()`

Registra todos os eventos da pagina.

- Linha 526: clique nas abas de dia.
- Linha 527: clique no filtro Integral.
- Linha 528: clique no filtro Noturno.
- Linha 529: clique no botao de excluir inscricoes.
- Linha 530: clique no botao de login/logout. Observacao: isso duplica a configuracao feita em `updateUIForAuthState`.
- Linha 531: cria um unico listener global de cliques no documento. Isso e delegacao de eventos.

Dentro do listener global:

- Linhas 532 a 536: botao `Ver Detalhes`.
  - Pega o alvo pelo `data-target-id`.
  - Alterna `hidden`.
  - Troca texto entre `Ver Detalhes` e `Ocultar Detalhes`.
- Linhas 537 a 552: botao `Ver Inscritos`.
  - Pega `uniqueId`.
  - Localiza a lista visual.
  - Limpa a lista.
  - Se houver inscritos, cria um `<li>` para cada um.
  - Se nao houver, mostra `Nenhum inscrito ainda`.
  - Alterna visibilidade da lista.
- Linhas 553 a 566: botao `Baixar PDF`.
  - Pega `uniqueId`.
  - Tenta separar dia e `lectureId` usando `split('-')`.
  - Localiza a palestra.
  - Cria `new jsPDF()`.
  - Escreve titulo e metadados.
  - Monta colunas da tabela.
  - Mapeia inscritos para linhas.
  - Gera tabela com `autoTable`.
  - Salva arquivo.

Ponto critico do PDF: `const [day, lectureId] = uniqueId.replace('dia', '').split('-')` quebra IDs que tambem contem hifen. Exemplo: `dia1-medicina-dia1` vira `["1", "medicina", "dia1"]`; `lectureId` recebe apenas `"medicina"`, mas o id real e `"medicina-dia1"`. Assim, o PDF pode nao encontrar a palestra e simplesmente retornar. Esse e um bug importante.

- Linhas 568 a 570: listener global de submit.
  - Se o form tiver id iniciando com `form-`, chama `handleRegistration`.

### Linhas 573 a 579: inicializacao

- Linha 573: declara `init`.
- Linhas 574 e 575: comentarios dizendo que nada e renderizado ate selecionar periodo.
- Linha 576: registra os eventos.
- Linha 579: chama `init()`.

Isso significa que ao abrir a pagina:

1. O HTML aparece.
2. O conteudo principal fica escondido.
3. Os eventos sao ligados.
4. O Firebase Auth observa login/logout.
5. As palestras so sao renderizadas depois que o usuario clica em Integral ou Noturno.

## 4. Modelo de dados atual

### Catalogo de palestras

Hoje fica no front-end:

```js
lecturesByDay = [
  {
    day: 1,
    lectures: [
      { id, title, periodo, description }
    ]
  }
]
```

### Inscricoes no Firestore

Colecao:

```text
artifacts/default-lecture-app/public/data/registrations
```

Documento:

```js
{
  lectureId: string,
  day: number,
  studentName: string,
  studentEmail: string,
  serie: string,
  curso: string,
  periodo: string,
  registeredAt: Timestamp,
  userId: string
}
```

## 5. Funcionalidades existentes

- Login com Google.
- Logout.
- Exibicao do usuario logado.
- Selecionar periodo Integral/Noturno.
- Modo escuro automatico no Noturno.
- Abas por dia.
- Cards de palestras/oficinas.
- Ver detalhes da atividade.
- Inscricao com nome, e-mail, serie, curso e periodo.
- Validacao para nao inscrever aluno de periodo diferente da atividade.
- Validacao para impedir mais de uma atividade no mesmo dia pelo mesmo e-mail.
- Contagem de vagas em tempo real.
- Bloqueio visual quando chega em 40 inscritos.
- Ver lista de inscritos por atividade.
- Gerar PDF simples por atividade no front-end.
- Excluir todas as inscricoes do usuario logado.

## 6. Problemas principais antes da refatoracao

1. Tudo esta em um arquivo unico: HTML, CSS, dados, Firebase e regras.
2. Os dados das palestras estao fixos no codigo.
3. A regra de vagas nao e garantida no banco.
4. A regra de uma inscricao por dia e feita no cliente.
5. O listener do Firestore pode ser duplicado ao trocar periodo.
6. O PDF tem bug ao separar `lectureId` com hifen.
7. Login e botao de auth sao configurados em dois lugares.
8. A colecao do Firestore tem nome pouco semantico.
9. O sistema baixa todas as inscricoes em tempo real.
10. Qualquer usuario logado consegue ver inscritos e baixar PDF, se as regras do Firebase permitirem.
11. O e-mail da inscricao pode ser diferente do e-mail do login.
12. `isFirstLoad` nao e usado.
13. Ha inconsistencias de classe CSS: `.periodo-tab-btn` vs `.periodo-filter-btn`.
14. Descricoes sao HTML em string.
15. Ha textos e IDs com padroes inconsistentes.

## 7. Como isso deveria virar React

Uma refatoracao saudavel poderia separar:

- `firebase.ts`: inicializacao do Firebase.
- `types.ts`: tipos `Lecture`, `Registration`, `Period`, `AcademicDay`.
- `data/lectures.ts`: catalogo temporario de palestras, ate migrar para Firestore.
- `components/AuthBar.tsx`: login, logout e dados do usuario.
- `components/PeriodSelector.tsx`: seletor Integral/Noturno.
- `components/DayTabs.tsx`: abas dos dias.
- `components/LectureCard.tsx`: card com formulario, contador, inscritos e acoes.
- `services/registrations.ts`: funcoes de criar, consultar, ouvir e deletar inscricoes.
- `hooks/useAuth.ts`: estado do usuario.
- `hooks/useRegistrations.ts`: listener controlado do Firestore.
- `pages` ou rotas: pagina principal e, futuramente, painel administrativo.

## 8. Como isso conversa com Spring Boot + JasperReports

Hoje o PDF e gerado no navegador por jsPDF. Para JasperReports, a geracao deveria sair do front-end e ir para um micro backend.

Fluxo sugerido:

1. React mostra botao `Baixar PDF`.
2. React chama endpoint Spring Boot, por exemplo:

```http
GET /reports/lectures/{lectureId}/registrations.pdf?day=1
```

3. Spring Boot valida permissao.
4. Spring Boot busca os inscritos no Firestore Admin SDK ou recebe dados de uma camada segura.
5. JasperReports preenche o template `.jrxml`.
6. Spring Boot retorna `application/pdf`.
7. React abre ou baixa o arquivo.

Isso resolve:

- Layout profissional de relatorios.
- PDF padronizado por ETEC/semana academica.
- Controle melhor de permissao.
- Menos regra sensivel no navegador.

## 9. Primeira prioridade tecnica

Antes de refatorar, eu corrigiria mentalmente o modelo:

- Evento: Semana Academica 2026.
- Dias do evento.
- Atividades: palestras/oficinas.
- Alunos/usuarios.
- Inscricoes.
- Relatorios.

O sistema atual mistura dia, atividade e periodo em strings e DOM ids. O React deve trabalhar com IDs estaveis e dados bem modelados, nao depender de `split('-')` nem de HTML montado por string.

