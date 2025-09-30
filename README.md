# mevo-challenge

url do desafio: [https://github.com/brunolobo-mevo/](https://github.com/brunolobo-mevo/dGVzdGU6bWV2b2JhY2tlbmQ/blob/main/README.md)

## Instalação

Para o projeto foi utilizado Node.JS v22.19.0

### Requisitos
- Node.JS v22.19.0
- Docker
- Docker Compose
- K6

Rode o comando:
```
npm install
```

## Como rodar o projeto

Para rodar use os comandos em ordem:

```
npm run docker:up
```

```
npm run build
```

```
npm run start
```

## Como rodar os testes

Para rodar os testes será necesário ter o `docker` instalado e como há a utilização de `testcontainers` é necessário rodar o comando abaixo:

```
docker login
```

Após isso será possível rodar os testes tendo o docker rodando usando o comando:

```
npm run test
```

## Como rodar o teste de fumaça

Para rodar o testes de fumaça será ncessário a instalação do K6.

Em um terminal rode os comandos abaixo:

```
npm run build
```

```
npm run start
```

Depois abra outro terminal e rode o comando para rodar os testes de fumaça:

```
npm run perf:smoke
```

---

## Validação dos dados - Checkpoint

- [x] Verificar se Prescricao tem duração maior que 0
- [x] Verificar se Prescricao NÃO CONTROLADA tem duração máxima de 90 dias
- [x] Verificar se Prescricao CONTROLADA tem duração máxima de 60 dias
- [x] Verificar se Prescricao CONTROLADA tem notas do médico
- [x] Verificar se Prescricao tem CÓDIGO DE UNIDADE FEDERATIVA válido
- [x] Verificar se Prescricao tem CPF de paciente válido
- [x] Verificar se Prescricao tem CRM do médico com 6 caracteres válidos

## Validações dos fluxos - Checkpoint

- [x] Cenário de arquivos de dados válidos
- [x] Cenário de arquivos de dados inválidos
- [x] Cenário de arquivos mal formatados (linhas em branco)
- [x] Cenário de arquivo corrompido

## Implementações

- [x] Node.JS streams
- [x] Node.JS child_process
- [x] elasticsearch
- [x] kibana
- [x] APM Server

## Estimativas

### Armazenamento de dados

> Precrições

A Mevo conta com mais de `25000` farmácias e clínicas, sendo que estas tem acesso aos arquivos que seriam digitalizados !

O armazenamento do dado deve ser armazenado por no mínimo `20 anos` contando a partir da data colocada na prescrição caso faça parte do prontuário, de acordo com o Conselho Federal de Medicina (CFM), a Agência Nacional de Vigilância Sanitária (ANVISA) e o Ministério da Saúde !

Supondo que cada farmácia tenha um arquivo com as informações de `1000000` prescrições de cada ano. E tenham os arquivos dos últimos `20 anos` !

Usando como base o arquivo fornecido para o teste, é possível estimar que um arquivo de 200 linhas tenha em média `25KB` !

Os arquivos CSV de `1000000` registros devem ter em média, aproximada `125MB`

Cada farmácia submeteria (20 x 125MB) = `2,5GB` de dados, de forma aproximada

Contando todas as `25000` farmácias parceiras da Mevo (25000 x 2,5GB) - de forma aproximada = `62TB` com retenção de `20 anos`

## Dados

### Banco de dados

- Elasticsearch

### Modelagem de dados

> prescriptions

```
{
  id: string(UUID),
  date: string,
  patient_cpf: string(CHAR(11)),
  doctor_crm: string,
  doctor_uf: string(CHAR(2)),
  medication: string,
  controlled: True | False,
  dosage: string,
  frequency: string,
  duration: number,
  notes: string
}
```

> upload-status

```
{
  id: string(UUID),
  upload_id: string(UUID),
  status: pending | processing | completed | failed,
  total_records: number,
  processed_records: number,
  valid_records: number,
}
```
> upload-status-errors

```
{
  id: string(UUID),
  upload_id: string(UUID),
  message: string,
  field: string,
  line: number,
  value: string
}
```

> audit-logs

```
{
  id: string(UUID),
  type: HTTP | JOB,
  resource: string,
  status: SUCCESS | PROCESSING | ERROR | CLOSED,
  ip: string,
  timestamp: string
}
```

## Decisões Técnicas

### Utilização de "streams" para leitura de dados

Como o sistema irá lidar com "arquivos grandes" será necessário ler o arquivo sob demanda para não carregar toda a informação direto na memória da aplicação !

### Processamento em batch

Como o sistema irá lidar com um grande volume de escritas e de "arquivos grandes" é necesário processar o arquivo em partes para não sobrecarregar a memória do processo.

### Utilização de "child_process"

Para permitir o processamento em background será utilizado "child_process" pra mover o processamneto do arquivo para outro processo para permitir um retorno mais rápido dos endpoints para o cliente !

### Utilização do "elasticsearch"

Para utilização do elasticsearch justificativas:

- Acesso a bulk insert, o que é prioritário dado a cenário de procesamento em batch
- Alta disponibilidade e acesso a integração com AWS OpenSearch permitindo integração com projetos nativos da AWS
- Possibilidade de sobrescrita de dados já existentes, dado ao cenário de falha caso o arquivo tenha prescrições duplicadas
- Suporte a dados não estruturados sendo que a forma como as prescrições são armazenadas pode ter variações

### Utilização do "express"

Como seria utilizado o módulo de "child_process" , foi escolhido a utilização do "express" devido a sua simplicidade, em contrapartida para o "Nest.JS" seria necessário a criação de um serviço e módulo apenas para a utilização de "child_process" !

## Benchmark

> Máquina: MacBook PRO - APPLE M2 - 8 GB

| Número de Arquivos | Batch Size | Tipo de Arquivo | Número de Registros |             endpoint            | Tempo de Processamento |
|:------------------:|:----------:|:---------------:|:-------------------:|:-------------------------------:|:----------------------:|
| 1                  | 1000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 2m                     |
| 1                  | 2000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 1m, 30s                |
| 1                  | 3000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 1m, 25s                |
| 1                  | 4000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 1m, 15s                |
| 3                  | 1000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 4m, 45s                |
| 3                  | 2000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 4m, 15s                |
| 3                  | 3000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 4m, 25s                |
| 3                  | 4000       | .csv            | 1.300.000           |  POST - api/prescription/upload | 4m, 20s                |

__OBS.: Tempo de Processamento é o tempo para fazer toda a leitura do arquivo, e não o tempo de resposta da API !__

## endpoints

### `POST - api/prescription/upload`

> #### Cenários - 201

- __Cenário de arquivo com valores válido__ - Deverá processar todo o arquivo em background, as prescrições serão armazenadas
- __Cenário de arquivo com valores inválidos__ - Deverá processar todo arquivo em background, as prescrições serão armazenadas e erros contabilizados
- __Cenário de arquivo mal formatado (linhas em branco)__ - Deverá processar todo arquivo em background, ignorando as linhas em branco, as prescrições serão armazenadas e erros contabilizados
- __Cenário de arquivo corrompido__ - Irá processar o que for possível e atualizará o processo de upload como `failed`

> #### Cenários - 400

- __Cenário de arquivo com extensão que não seja `.csv`__ - Deverá retornar um erro

### `GET - api/prescription/upload/:id`

> #### Cenários - 200

- __Cenário de upload que existe__ - Deverá retornar o status sendo os status possíveis sendo `pending | processing | completed | failed`

> #### Cenários - 404

- __Cenário de upload NÃO que existe__ - Deverá retornar um erro
