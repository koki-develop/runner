import got, { Method, Headers } from 'got'
import { makeRequest, gRPCRequestMetadata } from 'cool-grpc'
import { CookieJar } from 'tough-cookie'
import { renderObject } from 'liquidless'
import { fake } from 'liquidless-faker'
import { naughtystring } from 'liquidless-naughtystrings'
import xpath from 'xpath'
import FormData from 'form-data'
import * as cheerio from 'cheerio'
import { JSONPath } from 'jsonpath-plus'
import { DOMParser } from '@xmldom/xmldom'
import { compileExpression } from 'filtrex'
import flatten from 'flat'
import { EventEmitter } from 'node:events'
import { parseCSV, TestData } from './utils'
import crypto from 'crypto'
import fs from 'fs'
import yaml from 'js-yaml'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { PeerCertificate, TLSSocket } from 'node:tls'
import path from 'node:path'
import { Matcher, checkResult, CheckResult, CheckResults } from './matcher'
import { LoadTestCheck } from './loadtesting'
const { co2 } = require('@tgwf/co2')
import { Phase } from 'phasic'

export type EnvironmentVariables = {
  [key: string]: string;
}

export type Workflow = {
  version: string
  name: string
  env?: EnvironmentVariables
  tests?: Tests
  include?: string[]
  components?: WorkflowComponents
  config?: WorkflowConfig
}

export type WorkflowComponents = {
  schemas: {
    [key: string]: any
  }
}

export type WorkflowConfig = {
  loadTest?: {
    phases: Phase[]
    check?: LoadTestCheck
  },
  continueOnFail?: boolean,
  http?: {
    baseURL?: string
    rejectUnauthorized?: boolean
  }
}

export type WorkflowOptions = {
  path?: string
  secrets?: WorkflowOptionsSecrets
  ee?: EventEmitter
  env?: EnvironmentVariables
}

type WorkflowOptionsSecrets = {
  [key: string]: string
}

export type WorkflowResult = {
  workflow: Workflow
  result: {
    tests: TestResult[]
    passed: boolean
    timestamp: Date
    duration: number
    co2: number
  }
  path?: string
}

export type Test = {
  name?: string
  env?: object
  steps: Step[]
  config?: TestConfig
  testdata?: TestData
}

export type Tests = {
  [key: string]: Test
}

export type TestConfig = {
  continueOnFail?: boolean
}

type TestConditions = {
  captures?: CapturesStorage
  env?: object
}

export type Step = {
  id?: string
  name?: string
  if?: string
  http?: HTTPStep
  grpc?: gRPCStep
}

export type HTTPStep = {
  url: string
  method: string
  headers?: HTTPStepHeaders
  params?: HTTPStepParams
  cookies?: HTTPStepCookies
  body?: string | StepFile
  form?: HTTPStepForm
  formData?: HTTPStepMultiPartForm
  auth?: HTTPStepAuth
  json?: object
  graphql?: HTTPStepGraphQL
  trpc?: HTTPStepTRPC
  captures?: HTTPStepCaptures
  check?: HTTPStepCheck
  followRedirects?: boolean
  timeout?: number
}

export type HTTPStepTRPC = {
  [key: string]: {
    query?: object | string | number
    mutation?: object
  }
}

export type gRPCStep = {
  proto: string | string[]
  host: string
  service: string
  method: string
  data: object
  metadata?: gRPCRequestMetadata
  tls?: gRPCStepTLS
  captures?: gRPCStepCaptures
  check?: gRPCStepCheck
}

export type gRPCStepTLS = {
  rootCerts?: string | StepFile
  privateKey?: string | StepFile
  certChain?: string | StepFile
}

export type HTTPStepHeaders = {
  [key: string]: string
}

export type HTTPStepParams = {
  [key: string]: string
}

export type HTTPStepCookies = {
  [key: string]: string
}

export type HTTPStepForm = {
  [key: string]: string
}

export type HTTPStepMultiPartForm = {
  [key: string]: string | StepFile
}

export type StepFile = {
  file: string
}

export type HTTPStepAuth = {
  basic?: {
    username: string
    password: string
  }
  bearer?: {
    token: string
  }
  oauth?: {
    endpoint: string
    client_id: string
    client_secret: string
    audience?: string
  }
  certificate?: {
    ca?: string
    cert: string
    key: string
  }
}

type OAuthResponse = {
  access_token: string,
  expires_in: number,
  token_type: string
}

export type HTTPStepGraphQL = {
  query: string
  variables: object
}

export type HTTPStepCaptures = {
  [key: string]: HTTPStepCapture
}

export type gRPCStepCaptures = {
  [key: string]: gRPCStepCapture
}

export type HTTPStepCapture = {
  xpath?: string
  jsonpath?: string
  header?: string
  selector?: string
  cookie?: string
  regex?: string
}

export type gRPCStepCapture = {
  jsonpath?: string
}

type CapturesStorage = {
  [key: string]: any
}

export type HTTPStepCheck = {
  status?: number | Matcher[]
  statusText?: string | Matcher[]
  redirected?: boolean
  redirects?: string[]
  headers?: StepCheckValue | StepCheckMatcher
  body?: string | Matcher[]
  json?: object
  schema?: object
  jsonpath?: StepCheckJSONPath | StepCheckMatcher
  xpath?: StepCheckValue | StepCheckMatcher
  selectors?: StepCheckValue | StepCheckMatcher
  cookies?: StepCheckValue | StepCheckMatcher
  captures?: StepCheckCaptures
  sha256?: string
  md5?: string
  performance?: StepCheckPerformance | StepCheckMatcher
  ssl?: StepCheckSSL | StepCheckMatcher
  size?: number | Matcher[]
  co2?: number | Matcher[]
}

export type gRPCStepCheck = {
  json?: object
  schema?: object
  jsonpath?: StepCheckJSONPath | StepCheckMatcher
  captures?: StepCheckCaptures
  performance?: StepCheckPerformance | StepCheckMatcher
  size?: number | Matcher[]
  co2?: number | Matcher[]
}

export type StepCheckValue = {
  [key: string]: string
}

export type StepCheckJSONPath = {
  [key: string]: any
}

export type StepCheckPerformance = {
  [key: string]: number
}

export type StepCheckCaptures = {
  [key: string]: any
}

export type StepCheckSSL = {
  valid?: boolean
  signed?: boolean
  daysUntilExpiration?: number | Matcher[]
}

export type StepCheckMatcher = {
  [key: string]: Matcher[]
}

export type TestResult = {
  id: string
  name?: string
  steps: StepResult[]
  passed: boolean
  timestamp: Date
  duration: number
  co2: number
}

export type StepResult = {
  type?: 'http' | 'grpc'
  id?: string
  testId: string
  name?: string
  checks?: StepCheckResult
  errored: boolean
  errorMessage?: string
  passed: boolean
  skipped: boolean
  timestamp: Date
  duration: number
  responseTime: number
  co2: number
  request?: HTTPStepRequest | gRPCStepRequest
  response?: HTTPStepResponse | gRPCStepResponse
}

export type HTTPStepRequest = {
  protocol: string
  url: string
  method: string
  headers?: HTTPStepHeaders
  body?: string | Buffer | FormData
}

export type gRPCStepRequest = {
  proto: string | string[]
  host: string
  service: string
  method: string
  metadata?: gRPCRequestMetadata
  data: object
  tls?: gRPCStepRequestTLS
}

export type gRPCStepRequestTLS = {
  rootCerts?: string
  privateKey?: string
  certChain?: string
}

export type HTTPStepResponse = {
  protocol: string
  status: number
  statusText?: string
  duration?: number
  contentType?: string
  timings: any
  headers?: Headers
  ssl?: StepResponseSSL
  body: Buffer
  co2: number
}

export type gRPCStepResponse = {
  body: object | object[]
  duration: number
  co2: number
}

export type StepResponseSSL = {
  valid: boolean
  signed: boolean
  validUntil: Date
  daysUntilExpiration: number
}

export type StepCheckResult = {
  headers?: CheckResults
  redirected?: CheckResult
  redirects?: CheckResult
  json?: CheckResult
  schema?: CheckResult
  jsonpath?: CheckResults
  xpath?: CheckResults
  selectors?: CheckResults
  cookies?: CheckResults
  captures?: CheckResults
  status?: CheckResult
  statusText?: CheckResult
  body?: CheckResult
  sha256?: CheckResult
  md5?: CheckResult
  performance?: CheckResults
  ssl?: CheckResultSSL
  size?: CheckResult
  co2?: CheckResult
}

export type CheckResultSSL = {
  valid?: CheckResult
  signed?: CheckResult
  daysUntilExpiration?: CheckResult
}

// Check if expression
function checkCondition (expression: string, data: TestConditions): boolean {
  const filter = compileExpression(expression)
  return filter(flatten(data))
}

// Get cookie
function getCookie (store: CookieJar, name: string, url: string): string {
  return store.getCookiesSync(url).filter(cookie => cookie.key === name)[0]?.value
}

// Did all checks pass?
function didChecksPass (stepResult: StepResult) {
  if (!stepResult.checks) return true

  return Object.values(stepResult.checks as object).map(check => {
    return check['passed'] ? check.passed : Object.values(check).map((c: any) => c.passed).every(passed => passed)
  })
  .every(passed => passed)
}

// Run from YAML string
export function runFromYAML (yamlString: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  return run(yaml.load(yamlString) as Workflow, options)
}

// Run from test file
export async function runFromFile (path: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  const testFile = await fs.promises.readFile(path)
  const config = yaml.load(testFile.toString()) as Workflow
  return run(config, { ...options, path })
}

// Run workflow
export async function run (workflow: Workflow, options?: WorkflowOptions): Promise<WorkflowResult> {
  const timestamp = new Date()
  const schemaValidator = new Ajv({ strictSchema: false })
  addFormats(schemaValidator)

  // Add schemas to schema Validator
  if (workflow.components && workflow.components.schemas) {
    for (const schema in workflow.components.schemas) {
      schemaValidator.addSchema(workflow.components.schemas[schema], `#/components/schemas/${schema}`)
    }
  }

  const env = { ...workflow.env ?? {}, ...options?.env ?? {} }
  let tests = { ...workflow.tests ?? {} }

  if (workflow.include) {
    for (const workflowPath of workflow.include) {
      const testFile = await fs.promises.readFile(path.join(path.dirname(options?.path || __dirname), workflowPath))
      const test = yaml.load(testFile.toString()) as Workflow
      tests = { ...tests, ...test.tests }
    }
  }

  const testResults = await Promise.all(Object.entries(tests).map(([id, test]) => runTest(id, test, schemaValidator, options, workflow.config, env)))
  const workflowResult: WorkflowResult = {
    workflow,
    result: {
      tests: testResults,
      timestamp,
      passed: testResults.every(test => test.passed),
      duration: Date.now() - timestamp.valueOf(),
      co2: testResults.map(test => test.co2).reduce((a, b) => a + b)
    },
    path: options?.path
  }

  options?.ee?.emit('workflow:result', workflowResult)
  return workflowResult
}

async function runTest (id: string, test: Test, schemaValidator: Ajv, options?: WorkflowOptions, config?: WorkflowConfig, env?: object): Promise<TestResult> {
  const testResult: TestResult = {
    id,
    name: test.name,
    steps: [],
    passed: true,
    timestamp: new Date(),
    duration: 0,
    co2: 0
  }

  const captures: CapturesStorage = {}
  const cookies = new CookieJar()
  const ssw = new co2()
  let previous: StepResult | undefined
  let testData: object = {}

  // Load test data
  if (test.testdata) {
    const parsedCSV = await parseCSV(test.testdata, test.testdata.options)
    testData = parsedCSV[Math.floor(Math.random() * parsedCSV.length)]
  }

  for (let step of test.steps) {
    const stepResult: StepResult = {
      id: step.id,
      testId: id,
      name: step.name,
      timestamp: new Date(),
      passed: true,
      errored: false,
      skipped: false,
      duration: 0,
      responseTime: 0,
      co2: 0
    }

    // Skip current step is the previous one failed or condition was unmet
    if (((test.config?.continueOnFail ?? true) || (config?.continueOnFail ?? true)) && (previous && !previous.passed)) {
      stepResult.passed = false
      stepResult.errorMessage = 'Step was skipped because previous one failed'
      stepResult.skipped = true
    } else if (step.if && !checkCondition(step.if, { captures, env: { ...env, ...test.env } })) {
      stepResult.skipped = true
    } else {
      try {
        step = renderObject(step, {
          captures,
          env: { ...env, ...test.env },
          secrets: options?.secrets,
          testdata: testData
        },
        {
          filters: {
            fake,
            naughtystring
          },
          delimiters: ['${{', '}}']
        })

        if (step.http) {
          stepResult.type = 'http'
          let requestBody: string | FormData | Buffer | undefined

          // Prefix URL
          if (config?.http?.baseURL) {
            try {
              new URL(step.http.url)
            } catch {
              step.http.url = config.http.baseURL + step.http.url
            }
          }

          // Body
          if (step.http.body) {
            if (typeof step.http.body === 'string') {
              requestBody = step.http.body
            }

            if ((step.http.body as StepFile).file) {
              requestBody = await fs.promises.readFile((step.http.body as StepFile).file)
            }
          }

          //  JSON
          if (step.http.json) {
            requestBody = JSON.stringify(step.http.json)
          }

          // GraphQL
          if (step.http.graphql) {
            step.http.method = 'POST'
            requestBody = JSON.stringify(step.http.graphql)
          }

          // tRPC
          if (step.http.trpc) {
            // Does not support batching (yet)
            const [procedure, op] = Object.entries(step.http.trpc)[0]
            step.http.url = step.http.url + '/' + procedure

            if (op.query) {
              step.http.method = 'GET'
              step.http.params = {
                input: JSON.stringify(op.query)
              }
            }

            if (op.mutation) {
              step.http.method = 'POST'
              requestBody = JSON.stringify(op.mutation)
            }
          }

          // Form Data
          if (step.http.form) {
            const formData = new URLSearchParams()
            for (const field in step.http.form) {
              formData.append(field, step.http.form[field])
            }

            requestBody = formData.toString()
          }

          // Multipart Form Data
          if (step.http.formData) {
            const formData = new FormData()
            for (const field in step.http.formData) {
              if (typeof step.http.formData[field] === 'string') {
                formData.append(field, step.http.formData[field])
              }

              if ((step.http.formData[field] as StepFile).file) {
                const file = await fs.promises.readFile((step.http.formData[field] as StepFile).file)
                formData.append(field, file)
              }
            }

            requestBody = formData
          }

          // Basic Auth
          if (step.http.auth) {
            if (!step.http.headers) step.http.headers = {}

            if (step.http.auth.basic) {
              step.http.headers['Authorization'] = 'Basic ' + Buffer.from(step.http.auth.basic.username + ':' + step.http.auth.basic.password).toString('base64')
            }

            if (step.http.auth.bearer) {
              step.http.headers['Authorization'] = 'Bearer ' + step.http.auth.bearer.token
            }

            if (step.http.auth.oauth) {
              const { access_token } = await got.post(step.http.auth.oauth.endpoint, {
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  grant_type: 'client_credentials',
                  client_id: step.http.auth.oauth.client_id,
                  client_secret: step.http.auth.oauth.client_secret,
                  audience: step.http.auth.oauth.audience
                })
              }).json() as OAuthResponse

              step.http.headers['Authorization'] = 'Bearer ' + access_token
            }
          }

          // Set Cookies
          if (step.http.cookies) {
            for (const cookie in step.http.cookies) {
              await cookies.setCookie(cookie + '=' + step.http.cookies[cookie], step.http.url)
            }
          }

          // Make a request
          let sslCertificate: PeerCertificate | undefined
          const res = await got(step.http.url, {
            method: step.http.method as Method,
            headers: { ...step.http.headers },
            body: requestBody,
            searchParams: step.http.params ? new URLSearchParams(step.http.params) : undefined,
            throwHttpErrors: false,
            followRedirect: step.http.followRedirects ?? true,
            timeout: step.http.timeout,
            cookieJar: cookies,
            https: {
              certificate: step.http.auth?.certificate?.cert,
              key: step.http.auth?.certificate?.key,
              certificateAuthority: step.http.auth?.certificate?.ca,
              rejectUnauthorized: config?.http?.rejectUnauthorized ?? false
            }
          })
          .on('request', request => options?.ee?.emit('step:http_request', request))
          .on('response', response => options?.ee?.emit('step:http_response', response))
          .on('response', response => {
            if ((response.socket as TLSSocket).getPeerCertificate) {
              sslCertificate = (response.socket as TLSSocket).getPeerCertificate()
              if (Object.keys(sslCertificate).length === 0) sslCertificate = undefined
            }
          })

          const responseData = res.rawBody
          const body = await new TextDecoder().decode(responseData)

          stepResult.request = {
            protocol: 'HTTP/1.1',
            url: res.url,
            method: step.http.method,
            headers: step.http.headers,
            body: requestBody
          }

          stepResult.response = {
            protocol: `HTTP/${res.httpVersion}`,
            status: res.statusCode,
            statusText: res.statusMessage,
            duration: res.timings.phases.total,
            headers: res.headers,
            contentType: res.headers['content-type']?.split(';')[0],
            timings: res.timings,
            body: responseData,
            co2: ssw.perByte(responseData.byteLength)
          }

          if (sslCertificate) {
            stepResult.response.ssl = {
              valid: new Date(sslCertificate.valid_to) > new Date(),
              signed: sslCertificate.issuer.CN !== sslCertificate.subject.CN,
              validUntil: new Date(sslCertificate.valid_to),
              daysUntilExpiration: Math.round(Math.abs(new Date().valueOf() - new Date(sslCertificate.valid_to).valueOf()) / (24 * 60 * 60 * 1000))
            }
          }

          // Captures
          if (step.http.captures) {
            for (const name in step.http.captures) {
              const capture = step.http.captures[name]

              if (capture.jsonpath) {
                const json = JSON.parse(body)
                captures[name] = JSONPath({ path: capture.jsonpath, json })[0]
              }

              if (capture.xpath) {
                const dom = new DOMParser().parseFromString(body)
                const result = xpath.select(capture.xpath, dom)
                captures[name] = result.length > 0 ? (result[0] as any).firstChild.data : undefined
              }

              if (capture.header) {
                captures[name] = res.headers[capture.header]
              }

              if (capture.selector) {
                const dom = cheerio.load(body)
                captures[name] = dom(capture.selector).html()
              }

              if (capture.cookie) {
                captures[name] = getCookie(cookies, capture.cookie, res.url)
              }

              if (capture.regex) {
                captures[name] = body.match(capture.regex)?.[1]
              }
            }
          }

          if (step.http.check) {
            stepResult.checks = {}

            // Check headers
            if (step.http.check.headers) {
              stepResult.checks.headers = {}

              for (const header in step.http.check.headers) {
                stepResult.checks.headers[header] = checkResult(res.headers[header.toLowerCase()], step.http.check.headers[header])
              }
            }

            // Check body
            if (step.http.check.body) {
              stepResult.checks.body = checkResult(body.trim(), step.http.check.body)
            }

            // Check JSON
            if (step.http.check.json) {
              const json = JSON.parse(body)
              stepResult.checks.json = checkResult(json, step.http.check.json)
            }

            // Check Schema
            if (step.http.check.schema) {
              let sample = body

              if (res.headers['content-type']?.includes('json')) {
                sample = JSON.parse(body)
              }

              const validate = schemaValidator.compile(step.http.check.schema)
              stepResult.checks.schema = {
                expected: step.http.check.schema,
                given: sample,
                passed: validate(sample)
              }
            }

            // Check JSONPath
            if (step.http.check.jsonpath) {
              const json = JSON.parse(body)
              stepResult.checks.jsonpath = {}

              for (const path in step.http.check.jsonpath) {
                const result = JSONPath({ path, json })
                stepResult.checks.jsonpath[path] = checkResult(result[0], step.http.check.jsonpath[path])
              }
            }

            // Check XPath
            if (step.http.check.xpath) {
              stepResult.checks.xpath = {}

              for (const path in step.http.check.xpath) {
                const dom = new DOMParser().parseFromString(body)
                const result = xpath.select(path, dom)
                stepResult.checks.xpath[path] = checkResult(result.length > 0 ? (result[0] as any).firstChild.data : undefined, step.http.check.xpath[path])
              }
            }

            // Check HTML5 Selectors
            if (step.http.check.selectors) {
              stepResult.checks.selectors = {}
              const dom = cheerio.load(body)

              for (const selector in step.http.check.selectors) {
                const result = dom(selector).html()
                stepResult.checks.selectors[selector] = checkResult(result, step.http.check.selectors[selector])
              }
            }

            // Check Cookies
            if (step.http.check.cookies) {
              stepResult.checks.cookies = {}

              for (const cookie in step.http.check.cookies) {
                const value = getCookie(cookies, cookie, res.url)
                stepResult.checks.cookies[cookie] = checkResult(value, step.http.check.cookies[cookie])
              }
            }

            // Check captures
            if (step.http.check.captures) {
              stepResult.checks.captures = {}

              for (const capture in step.http.check.captures) {
                stepResult.checks.captures[capture] = checkResult(captures[capture], step.http.check.captures[capture])
              }
            }

            // Check status
            if (step.http.check.status) {
              stepResult.checks.status = checkResult(res.statusCode, step.http.check.status)
            }

            // Check statusText
            if (step.http.check.statusText) {
              stepResult.checks.statusText = checkResult(res.statusMessage, step.http.check.statusText)
            }

            // Check whether request was redirected
            if ('redirected' in step.http.check) {
              stepResult.checks.redirected = checkResult(res.redirectUrls.length > 0, step.http.check.redirected)
            }

            // Check redirects
            if (step.http.check.redirects) {
              stepResult.checks.redirects = checkResult(res.redirectUrls, step.http.check.redirects)
            }

            // Check sha256
            if (step.http.check.sha256) {
              const hash = crypto.createHash('sha256').update(Buffer.from(responseData)).digest('hex')
              stepResult.checks.sha256 = checkResult(hash, step.http.check.sha256)
            }

            // Check md5
            if (step.http.check.md5) {
              const hash = crypto.createHash('md5').update(Buffer.from(responseData)).digest('hex')
              stepResult.checks.md5 = checkResult(hash, step.http.check.md5)
            }

            // Check Performance
            if (step.http.check.performance) {
              stepResult.checks.performance = {}

              for (const metric in step.http.check.performance) {
                stepResult.checks.performance[metric] = checkResult((res.timings.phases as any)[metric], step.http.check.performance[metric])
              }
            }

            // Check SSL certs
            if (step.http.check.ssl && sslCertificate) {
              stepResult.checks.ssl = {}

              if ('valid' in step.http.check.ssl) {
                stepResult.checks.ssl.valid = checkResult(stepResult.response.ssl?.valid, step.http.check.ssl.valid)
              }

              if ('signed' in step.http.check.ssl) {
                stepResult.checks.ssl.signed = checkResult(stepResult.response.ssl?.signed, step.http.check.ssl.signed)
              }

              if (step.http.check.ssl.daysUntilExpiration) {
                stepResult.checks.ssl.daysUntilExpiration = checkResult(stepResult.response.ssl?.daysUntilExpiration, step.http.check.ssl.daysUntilExpiration)
              }
            }

            // Check byte size
            if (step.http.check.size) {
              stepResult.checks.size = checkResult(responseData.byteLength, step.http.check.size)
            }

            // Check co2 emissions
            if (step.http.check.co2) {
              stepResult.checks.co2 = checkResult(stepResult.response.co2, step.http.check.co2)
            }
          }
        }

        if (step.grpc) {
          stepResult.type = 'grpc'

          // Load TLS configuration from file or string
          let tlsConfig: gRPCStepRequestTLS = {}
          if (step.grpc.tls) {
            if (step.grpc.tls.rootCerts) {
              if ((step.grpc.tls.rootCerts as StepFile).file) {
                const file = await fs.promises.readFile((step.grpc.tls.rootCerts as StepFile).file)
                tlsConfig.rootCerts = file.toString()
              } else {
                tlsConfig.rootCerts = step.grpc.tls.rootCerts as string
              }
            }

            if (step.grpc.tls.privateKey) {
              if ((step.grpc.tls.privateKey as StepFile).file) {
                const file = await fs.promises.readFile((step.grpc.tls.privateKey as StepFile).file)
                tlsConfig.privateKey = file.toString()
              } else {
                tlsConfig.privateKey = step.grpc.tls.privateKey as string
              }
            }

            if (step.grpc.tls.certChain) {
              if ((step.grpc.tls.certChain as StepFile).file) {
                const file = await fs.promises.readFile((step.grpc.tls.certChain as StepFile).file)
                tlsConfig.certChain = file.toString()
              } else {
                tlsConfig.certChain = step.grpc.tls.certChain as string
              }
            }
          }

          const request: gRPCStepRequest = {
            proto: step.grpc.proto,
            host: step.grpc.host,
            metadata: step.grpc.metadata,
            service: step.grpc.service,
            method: step.grpc.method,
            data: step.grpc.data,
            tls: tlsConfig
          }

          const { data, size } = await makeRequest(step.grpc.proto, {
            ...request,
            beforeRequest: (req) => {
              stepResult.request = request
              options?.ee?.emit('step:grpc_request', request)
            },
            afterResponse: (res) => {
              stepResult.response = {
                body: res.data,
                duration: Date.now() - stepResult.timestamp.valueOf(),
                co2: ssw.perByte(res.size)
              }

              options?.ee?.emit('step:grpc_response', res)
            }
          })

          // Captures
          if (step.grpc.captures) {
            for (const name in step.grpc.captures) {
              const capture = step.grpc.captures[name]
              if (capture.jsonpath) {
                captures[name] = JSONPath({ path: capture.jsonpath, json: data })[0]
              }
            }
          }

          if (step.grpc.check) {
            stepResult.checks = {}

            // Check JSON
            if (step.grpc.check.json) {
              stepResult.checks.json = checkResult(data, step.grpc.check.json)
            }

            // Check Schema
            if (step.grpc.check.schema) {
              const validate = schemaValidator.compile(step.grpc.check.schema)
              stepResult.checks.schema = {
                expected: step.grpc.check.schema,
                given: data,
                passed: validate(data)
              }
            }

            // Check JSONPath
            if (step.grpc.check.jsonpath) {
              stepResult.checks.jsonpath = {}

              for (const path in step.grpc.check.jsonpath) {
                const result = JSONPath({ path, json: data })
                stepResult.checks.jsonpath[path] = checkResult(result[0], step.grpc.check.jsonpath[path])
              }
            }

            // Check captures
            if (step.grpc.check.captures) {
              stepResult.checks.captures = {}

              for (const capture in step.grpc.check.captures) {
                stepResult.checks.captures[capture] = checkResult(captures[capture], step.grpc.check.captures[capture])
              }
            }

            // Check performance
            if (step.grpc.check.performance) {
              stepResult.checks.performance = {}

              if (step.grpc.check.performance.total) {
                stepResult.checks.performance.total = checkResult(stepResult.response?.duration, step.grpc.check.performance.total)
              }
            }

            // Check byte size
            if (step.grpc.check.size) {
              stepResult.checks.size = checkResult(size, step.grpc.check.size)

            }

            // Check co2 emissions
            if (step.grpc.check.co2) {
              stepResult.checks.co2 = checkResult(stepResult.response?.co2, step.grpc.check.co2)
            }
          }
        }

        stepResult.passed = didChecksPass(stepResult)
      } catch (error) {
        stepResult.passed = false
        stepResult.errored = true
        stepResult.errorMessage = (error as Error).message
        options?.ee?.emit('step:error', error)
      }
    }

    stepResult.duration = Date.now() - stepResult.timestamp.valueOf()
    stepResult.responseTime = stepResult.response?.duration || 0
    stepResult.co2 = stepResult.response?.co2 || 0
    testResult.steps.push(stepResult)
    previous = stepResult

    options?.ee?.emit('step:result', stepResult)
  }

  testResult.duration = Date.now() - testResult.timestamp.valueOf()
  testResult.co2 = testResult.steps.map(step => step.co2).reduce((a, b) => a + b)
  testResult.passed = testResult.steps.every(step => step.passed)

  options?.ee?.emit('test:result', testResult)
  return testResult
}
