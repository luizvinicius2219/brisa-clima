# Brisa

O clima, em outra perspectiva. Um observatório pessoal que combina previsão meteorológica, exploração num mapa, contexto climático, comparação entre cidades e cartões de compartilhamento.

## O que já funciona

- Previsão atual, horária e para sete dias, servida pelo Open-Meteo.
- Mapa interativo com temperaturas, probabilidades de chuva e vento nos pontos de dados de 12 capitais brasileiras. O mapa base é CARTO/OpenStreetMap. O app não apresenta esses marcadores como radar nem como medições de toda a área.
- Busca de cidades, localização do navegador sob demanda, coordenadas arredondadas e favoritos locais.
- Comparação entre cidades e contexto histórico ERA5, para os dez últimos anos completos.
- Resumo baseado nos dados, sugestão dos melhores horários para sair, horários do sol, chuva, vento, umidade e índice UV.
- Cartões PNG nos formatos feed e stories, prontos para baixar ou compartilhar pelo celular e WhatsApp.
- Gemini opcional, conectado por escolha do usuário. A previsão continua disponível sem uma chave.

## Desenvolvimento

Requer Node.js >= 22.13.0 e npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

```bash
npm run typecheck
npm run build
npm run start
```

## Gemini (opcional)

Conecte a chave do [Google AI Studio](https://aistudio.google.com/api-keys) nas configurações do app. A chave fica na memória da aba, sem ser guardada no localStorage, e segue por HTTPS ao servidor para a chamada ao Google. Nenhuma chave aparece no bundle do navegador.

Uma publicação privada também pode ser pré-configurada com `GEMINI_API_KEY` e `GEMINI_MODEL` no painel de ambiente do Vercel. O modelo inicial é `gemini-3.8-flash`; altere-o de acordo com a disponibilidade na conta Google. Os pedidos de geração são deliberados e limitados por instância de servidor.

## Dados e limites

- **Previsão:** Open-Meteo. A descrição do tempo atual também é uma estimativa do modelo, não uma medição de estação. A API de previsão usa cache de cinco minutos.
- **Histórico:** Open-Meteo, ERA5. São dez anos completos, e não a normal climatológica de trinta anos usada como referência por muitas análises climáticas. A comparação de uma média diária prevista com a média mensal serve para contexto, não para afirmar recordes nem tendências.
- **Mapa:** previsões numéricas em doze capitais, nos pontos identificados. Não há interpolação espacial ou cobertura de radar. A busca de outras cidades continua disponível.
- **Janela para sair:** regra explícita baseada em chuva, temperatura, vento, UV, trovoadas e horário diurno, aplicada aos próximos horários disponíveis. É uma indicação, não um alerta ou garantia.
- **Avisos oficiais:** consulte o [INMET](https://alertas2.inmet.gov.br/) e a Defesa Civil local.
- **Atribuição:** [licença Open-Meteo](https://open-meteo.com/en/licence), [CARTO](https://carto.com/attributions/) e [OpenStreetMap](https://www.openstreetmap.org/copyright).

## Implantação

O Brisa usa as rotas de servidor do Next.js e precisa de uma implantação Next.js completa. Para um repositório com mais de um app, configure `brisa` como root directory no projeto Vercel. A versão inicial não precisa de tokens meteorológicos nem de chaves públicas no bundle.
