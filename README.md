# Description

This is a [prometheus exporter](https://prometheus.io/docs/instrumenting/exporters/) to show daily cost of aws services. Also exporter show the region and account cost.   

**WARNING0:** The region cost don't show the "not region" cost

**WARNING1:** It's show only cost for regions and services, where the cost was more then $0  

**WARNING2**   
It takes approximately 5 minutes to collect the data(in my case, this is depended on number of active serices and regions), so don't set the cronjob to run more often then 5min. 
I recommendet to run with default settings.

## For running in AWS EKS
In aws eks you can use the role, with permissions that you need. 
For this you need to create the k8s [serviceAccount](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/master/README.md) with the role and then mount this to deployment.
This role need the policy "AssumeRoleWithWebIdentity"

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
4. Region cost monthly
```
...
cost_region_month{type="region",service="month",region="eu-north-1",unit="USD"} 2144.4543095665
cost_region_month{type="region",service="month",region="eu-west-2",unit="USD"} 0.0000509429
cost_region_month{type="region",service="month",region="eu-west-1",unit="USD"} 5349.5967276573
cost_region_month{type="region",service="month",region="eu-central-1",unit="USD"} 10380.7525458852
cost_region_month{type="region",service="month",region="us-east-1",unit="USD"} 14.2658663195
cost_region_month{type="region",service="month",region="us-east-2",unit="USD"} 2.9802420231
cost_region_month{type="region",service="month",region="us-west-2",unit="USD"} 0.1930107496
...
```
5. Account cost monthly
```
...
cost_account_month{type="account",unit="2222",account="USD",description="CICD"} 20.803763436
cost_account_month{type="account",unit="3333",account="USD",description="Infrastructure"} 364.4863358101
cost_account_month{type="account",unit="4444",account="USD",description="Integration"} 69.0948979786
cost_account_month{type="account",unit="5555",account="USD",description="VPN"} 28.4227041386
cost_account_month{type="account",unit="6666",account="USD",description="Staging"} 0.0000112
cost_account_month{type="account",unit="8888",account="USD",description="Production"} 0.000015
...
```

# AWS Permissions
Your user need following permissions

- ec2:describeRegions (AmazonEC2ReadOnlyAccess policy contain the permission)
- ce:GetCostAndUsage
- ce:GetDimensionValues

# ENV Variables
 
**AWS_ACCESSKEYID**   
**AWS_SECRETACCESSKEY**  
**AWS_COSTREGION** - Cost Explorer api endpoint, default "us-east-1"  

**PROVIDER** - type of credential, if set 'AWS', it's mean the pod running in AWS EKS and can use the credentials from k8s serviceAccount([more](https://github.com/jtblin/kube2iam)). In this case you don't need to set **AWS_ACCESSKEYID** and **AWS_SECRETACCESSKEY**

**MPORT** - port of exporter, default 9232  
**CRON** - cronjob string, default '* * 01 * *' 
**AWS_SERVICES** - filter, to get cost of certain service/s (Exp: AWS Key Management Service,Amazon Elastic Block Store), default 'all'  
**AWS_REGIONS** - filter, to get cost of certain region/s (Exp: eu-west-1,eu-north-1)  
**AWS_METRICTYPE** - [type](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ce-advanced.html) of colleced metric, default 'UnblendedCost'. Possible are 'AmortizedCost, BlendedCost, NetAmortizedCost, NetUnblendedCost, NormalizedUsageAmount, UnblendedCost, and UsageQuantity'

# Start
## with docker
```
docker run --name aws-exporter -p 9232:9232 -e AWS_ACCESSKEYID="XXX" -e AWS_SECRETACCESSKEY="XXX" -e -t de1m/aws-cost-exporter:latest
```

## without docker

1. Set all env variables
2. ```git clone git@github.com:de1m/aws-cost-exporter.git```
3. ```npm i ```
4. ```create AWS environments variables```
5. ```node app.js```

