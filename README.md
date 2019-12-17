# Description

This is a [prometheus exporter](https://prometheus.io/docs/instrumenting/exporters/) to show daily cost of aws services

## Collected information

1. All services together in all regions (TYPE cost_all)
```
cost_all{type="all",unit="USD"} 1655.8311381101
```
2. Services sorted by region (TYPE cost_region)
```
...
cost_region{type="region",service="all",region="eu-north-1",unit="USD"} 296.7056863111
cost_region{type="region",service="AWS Key Management Service",region="eu-north-1",unit="USD"} 0.000111
cost_region{type="region",service="AWS Secrets Manager",region="eu-north-1",unit="USD"} 0.466095752
cost_region{type="region",service="Amazon Elastic Block Store",region="eu-north-1",unit="USD"} 69.5610225786
cost_region{type="region",service="Amazon Elastic Compute Cloud - Compute",region="eu-north-1",unit="USD"} 189.9076039496
...
```

3. Regions sorted by services (TYPE cost_service)
```
...
cost_service{type="service",service="AWS Cost Explorer",region="all",unit="USD"} 60.87
cost_service{type="service",service="AWS Cost Explorer",region="us-east-1",unit="USD"} 60.87
cost_service{type="service",service="AWS Key Management Service",region="all",unit="USD"} 0.34125044
cost_service{type="service",service="AWS Key Management Service",region="eu-north-1",unit="USD"} 0.000111
cost_service{type="service",service="AWS Key Management Service",region="eu-west-1",unit="USD"} 0.159492
...
```

# AWS Permissions
Your user need following permissions

- read information from Billing
- read cost of all services
- read cost of all regions

# ENV Variables
 
**AWS_ACCESSKEYID**   
**AWS_SECRETACCESSKEY**  
**AWS_COSTREGION** - Cost Explorer api endpoint, default "us-east-1"  

**MPORT** - port of exporter, default 9232  
**CRON** - cronjob string, default '00 00 01 * *' (Every day at 01:00 AM)  
**CRONTIMEZONE** - timezone for cronjob, dafault 'Europe/Berlin'  
**AWS_SERVICES** - filter, to get cost of certain service/s (Exp: AWS Key Management Service,Amazon Elastic Block Store), default 'all'  
**AWS_REGIONS** - filter, to get cost of certain region/s (Exp: eu-west-1,eu-north-1)  

# Start
## with docker
```
docker run --name aws-exporter -p 9232:9232 -e AWS_ACCESSKEYID="XXX" -e AWS_SECRETACCESSKEY="XXX" -e -t de1m/aws-cost-exporter:latest
```

## without docker

1. Set all env variables
2. ```git clone git@github.com:de1m/aws-cost-exporter.git```
3. ```npm i ```
4. ```node app.js```

