# mevo-challenge

url do desafio: [https://github.com/brunolobo-mevo/](https://github.com/brunolobo-mevo/dGVzdGU6bWV2b2JhY2tlbmQ/blob/main/README.md)

## Instalação

Para o projeto foi utilizado Node.JS v22.19.0

Rode o comando:
```
npm install
```

## Como rodar o projeto

Para rodar use os comandos em ordem:

```
npm run build
```

```
npm run start
```

---

## Validação dos dados - Checkpoint

- [x] Verificar se Prescricao tem duração maior que 0
- [x] Verificar se Prescricao NÃO CONTROLADA tem duração máxima de 90 dias
- [x] Verificar se Prescricao CONTROLADA tem duração máxima de 60 dias
- [x] Verificar se Prescricao CONTROLADA tem notas do médico
- [x] Verificar se Prescricao tem CÓDIGO DE UNIDADE FEDERATIVA válido
- [x] Verificar se Prescricao tem CPF de paciente válido

## Validações dos fluxos - Checkpoint

- [x] Cenário de arquivos de dados válidos
- [x] Cenário de arquivos de dados inválidos
- [x] Cenário de arquivo corrompido

# Implementações

- [x] Node.JS streams
- [ ] elasticsearch - (ainda usa db em memória)
- [ ] Node.JS child_process

## Decisões Técnicas

### Utilização de Streams para leitura de dados

Como o sistema irá lidar com "arquivos grandes" será necessário processar os arquivos sem travar o processamento da Thread Principal do Node.JS então para permitir a resposta as streams serão usadas para possibilitar o processamento em background.

### Processamento em batch

Como o sistema irá lidar com um grande volume de escritas e de "arquivos grandes" é necesário processar o arquivo em partes para não sobrecarregar a memória do processo.

### Utilização de "child_process"

Para permitir uma utilização mais otimizada dos recursos da aplicação serão usados child_process para rodar o processamento em background para deixar a thread principalm livre e possibilitar processamento maior de arquivos em paralelo.

### Utilização do "elasticsearch"

Para utilização do elasticsearch justificativas:

- Acesso a bulk insert, o que é prioritário dado a cenário de procesamento em batch
- Alta disponibilidade e acesso a integração com AWS OpenSearch permitindo integração com projetos nativos da AWS
- Possibilidade de reescrita de dados já existentes, dado ao cenário de falha caso o arquivo seja corrompido
- Suporte a dados nào estruturados sendo que a forma como a prescrições são armazenadas pode ter variações

## Cenários

## Fluxo de arquivo com dados válidos

Para cenários de dados válidos o endpoint `POST - api/prescription/upload` irá processar em batchs as partes do arquivo CSV em background disponibilizando as informações conforme forem processadas !

## Fluxo de arquivo com dados inválidos

Para cenários de dados inválidos o endpoint `POST - api/prescription/upload` irá processar em batchs as partes do arquivo CSV em background cada erro de validação será disponibilizado e armazenado em outro driver de dados para permitir a consulta, permitindo o processamento do batch do arquivo !

## Fluxo de arquivo corrompido

Para cenários de arquivos corrompidos será necessário o processamento em batch será interrompido para que o usuário possa fazer o download novamente do arquivo !

<br/>

## Fluxo dos endpoints

### `POST - api/prescription/upload`

Para permitir o processamento assíncrono dos dados o processamento do arquivo será feito em background, para isso será usado a parte de streams do nodejs sendo que elas são não bloqueantes. Para evitar problemas com a memória será usado um processamento em batch, então o arquivo CSV poderá ser lido em partes e processado de forma adequada sem afetar a memória !

### `GET - api/prescription/upload/:id`

Endpoint para pegar os status do upload do arquivo !

<br/>