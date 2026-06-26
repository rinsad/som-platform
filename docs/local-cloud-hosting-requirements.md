# Local Cloud Hosting Requirements for SOM Business Applications

## 1. Purpose

Shell Oman Marketing requires local cloud hosting in Oman for one main business platform application and three additional separate business applications hosted on the same server environment. The hosting provider may be Ooredoo, Oman Data Park, or another approved local cloud provider.

The environment must provide secure, reliable, and scalable hosting with local data residency, SSL protection, managed security controls, backup, monitoring, and periodic security assessment.

## 2. Application Scope

The hosting environment will support:

1. One main SOM Platform application containing multiple modules.
2. Three additional separate applications to be hosted on the same server environment.

The SOM Platform application includes modules such as:

- CAPEX management module
- Purchase request management module
- Asset registry / asset management module
- Internal portal / related business workflow module

The three additional applications will be confirmed separately, but the hosting environment should be sized to run all four application workloads together: one modular SOM Platform application plus three separate applications.

The applications should be hosted under separate URLs or subdomains and served from a shared cloud server environment.

Example URL structure:

- `som-platform.company.com`
- `app2.company.com`
- `app3.company.com`
- `app4.company.com`

Final domain names will be confirmed later.

## 3. Recommended Hosting Architecture

The preferred architecture is:

- One Linux cloud server hosted in Oman
- One public IP address
- Reverse proxy, such as Nginx, to route traffic to the SOM Platform and the three separate applications
- SSL certificate covering all application URLs
- Web Application Firewall in front of the applications
- Provider-level DDoS protection
- VPN access for administration
- Daily backup with retention
- Monitoring and support SLA

## 4. Server Specification

| Item | Requirement |
| --- | --- |
| Hosting location | Oman data center / local cloud region |
| Operating system | Linux, preferably Ubuntu LTS or equivalent |
| vCPU | Minimum 8 vCPU preferred for all workloads; 4 vCPU only acceptable for pilot/UAT |
| RAM | Minimum 32 GB preferred for all workloads; 16 GB only acceptable for pilot/UAT |
| Storage | Minimum 300 GB SSD preferred; 200 GB minimum for first phase |
| Storage expansion | Required |
| Database | PostgreSQL support, preferably managed database or separate database volume |
| Backup | Daily backup with minimum 30-day retention |
| Monitoring | Server health, uptime, CPU, memory, disk, and network monitoring |
| Support | 24x7 support preferred |

## 5. Hosting Environment Selection

| Hosting Requirement | Required Selection |
| --- | --- |
| Hosting Environment | Linux |
| Bandwidth | Minimum 6 Mbps; preferred scalable or burstable 10-20 Mbps if available |
| Number of Public IPs | 1 public IP |
| SSL Certificate | Yes, wildcard SSL preferred |
| SSL VPN User | Yes, 2-3 admin users initially |

## 6. Security Requirements

| Security Item | Required Selection |
| --- | --- |
| External Vulnerability Assessment per Public IP | Yes |
| Monthly Application Security Scan per URL | No |
| Quarterly Application Security Scan per URL | Yes, for each externally accessible application URL |
| Semi-Annual Application Security Scan per URL | No |
| Annual Application Security Scan per URL | No, if quarterly scanning is selected |
| Malware Scanning per URL | Yes |
| Web Application Firewall | Yes |
| DDoS Protection | Yes |
| Anti-Virus / EDR per User or Server | Yes |
| Cloud-Based Anti-Spam per Mailbox | No, unless email hosting is included |
| VAPT | Yes |
| VAPT Type | Grey-box External |
| VAPT Activity Frequency | Yearly, and additionally after major go-live or major release changes |

## 7. Network and Access Requirements

- The environment should expose only required application ports to the internet.
- Administrative access must be restricted through SSL VPN or equivalent secure access.
- SSH access must not be open to the public internet.
- Provider should support firewall rules or security groups.
- Provider should support IP allowlisting for administrator access.
- The four applications should be accessible over HTTPS only.

## 8. SSL and Domain Requirements

The provider should include or support:

- SSL certificate installation and renewal
- Wildcard SSL certificate, if available
- HTTPS enforcement
- TLS 1.2 or higher
- Support for multiple subdomains on one public IP

## 9. Backup and Recovery Requirements

The hosting provider should provide:

- Daily server backup
- Minimum 30-day backup retention
- Backup restore support
- Clear RPO and RTO commitments
- Option to take manual backup before major releases
- Database backup support

Preferred recovery targets:

| Item | Preferred Target |
| --- | --- |
| RPO | 24 hours or better |
| RTO | 4-8 hours or better |

## 10. Security Assessment Requirements

The provider should include or support the following:

- External vulnerability assessment for the public IP
- Quarterly application security scan for each externally accessible application URL
- Annual grey-box external VAPT
- Malware scanning per application URL
- Remediation report after every scan or VAPT
- Re-scan after critical or high vulnerabilities are fixed

## 11. Compliance and Data Residency

The provider must confirm:

- Data is hosted in Oman
- Backups are hosted in Oman or in an approved location
- Administrative access and support processes are controlled
- Security logs can be provided if required
- Provider can support audit or compliance evidence when requested

## 12. Required Provider Response

The provider is requested to confirm:

1. Whether the proposed hosting is available in Oman.
2. Whether Linux cloud hosting is supported.
3. Available vCPU, RAM, and storage packages.
4. Whether 1 public IP can host the SOM Platform and 3 additional applications through subdomains.
5. Available bandwidth options and upgrade path.
6. Whether WAF is available and whether it is managed.
7. Whether DDoS protection is included.
8. Whether SSL certificate is included or separately charged.
9. Whether SSL VPN users are included or separately charged.
10. Backup frequency, retention, and restore SLA.
11. Whether PostgreSQL managed database is available.
12. Whether vulnerability assessment and VAPT services are available.
13. Quarterly application security scan cost per URL.
14. Annual grey-box external VAPT cost.
15. Support SLA and escalation process.

## 13. Commercial Quote Format Requested

Please provide the commercial quote in the following structure:

| Cost Item | Included / Not Included | Quantity | Unit Cost | Monthly Cost | Annual Cost |
| --- | --- | ---: | ---: | ---: | ---: |
| Linux cloud server |  | 1 |  |  |  |
| vCPU / RAM / SSD package |  | 1 |  |  |  |
| Public IP |  | 1 |  |  |  |
| Bandwidth |  | 1 |  |  |  |
| SSL certificate |  | 1 |  |  |  |
| SSL VPN users |  | 2-3 |  |  |  |
| WAF |  | 1 |  |  |  |
| DDoS protection |  | 1 |  |  |  |
| Malware scanning |  | 4 application URLs initially |  |  |  |
| Quarterly application security scan |  | 4 application URLs initially |  |  |  |
| External vulnerability assessment |  | 1 public IP |  |  |  |
| Annual grey-box VAPT |  | 1 environment / 4 application URLs |  |  |  |
| Backup service |  | 1 |  |  |  |
| Monitoring |  | 1 |  |  |  |
| Support SLA |  | 1 |  |  |  |

## 14. Preferred Final Package

The preferred package is:

- Linux cloud server hosted in Oman
- 8 vCPU preferred, 4 vCPU acceptable only for pilot/UAT
- 32 GB RAM preferred, 16 GB acceptable only for pilot/UAT
- 300 GB SSD preferred, 200 GB minimum for first phase
- 1 public IP
- Minimum 6 Mbps bandwidth, scalable if required
- SSL certificate for all application URLs
- Managed WAF
- DDoS protection
- SSL VPN for 2-3 admin users
- Daily backup with 30-day retention
- Quarterly application security scanning for 4 application URLs initially
- Annual grey-box external VAPT
- Malware scanning
- Provider support SLA

## 15. Notes

Advanced requirements such as high availability, disaster recovery site, load balancing, managed Kubernetes, or dedicated database clustering are not mandatory for the first phase unless recommended by the provider with clear cost impact.

The initial requirement is for a secure and scalable single-server deployment for one modular SOM Platform application and three additional separate applications, with the ability to upgrade resources later.
