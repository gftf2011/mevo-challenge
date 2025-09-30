import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    scenarios: {
        warmup: {
            executor: "constant-vus",
            vus: 1,
            duration: "30s",
            exec: "warmup",
        },
        smoke_test: {
            executor: "constant-vus",
            vus: 5,
            duration: "5m",
            exec: "main",
            startTime: "30s"
        },
    },
    thresholds: {
      'http_req_duration{scenario:smoke_test}': [
        "p(92)<=200",
      ],
    },
};

const file = open("../prescricoes.csv", "b");

export function warmup() {
    const data = {
        file: http.file(file, "prescricoes.csv", "text/csv"),
    };

    http.post("http://localhost:3000/api/prescriptions/upload", data);

    sleep(1);
}

export function main() {
    const data = {
        file: http.file(file, "prescricoes.csv", "text/csv"),
    };

    const res = http.post("http://localhost:3000/api/prescriptions/upload", data);

    check(res, {
        "status is 201": (r) => r.status === 201,
        "response time <= 400ms": (r) => r.timings.duration <= 400,
        "content-type is JSON": (r) =>
            r.headers["Content-Type"] &&
            r.headers["Content-Type"].includes("application/json"),
        "response body": (r) => r.body.includes("upload_id") && r.body.includes("status") && r.body.includes("total_records") && r.body.includes("processed_records") && r.body.includes("valid_records") && r.body.includes("errors")
    });

    sleep(1);
}