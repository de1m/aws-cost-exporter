# Links
https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CostExplorer.html#getCostAndUsage-property
https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CostExplorer.html - Cost Explorer

# Show active services in all regions

## Methode

[getDimensionValues](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CostExplorer.html#getDimensionValues-property)

### param
```
var params = {
    TimePeriod: { /* required */
        "Start": "2019-11-01",
        "End": "2019-12-01"
    },
    "Dimension": "Service"
};
```

### Output
```
{"DimensionValues":[{
"Value":"AWS CodePipeline","Attributes":{}},{
"Value":"AWS Key Management Service","Attributes":{}},{
"Value":"AWS Secrets Manager","Attributes":{}},{
"Value":"AWS Support (Developer)","Attributes":{}},{
"Value":"AWS Systems Manager","Attributes":{}},{
"Value":"Amazon DynamoDB","Attributes":{}},{
"Value":"Amazon EC2 Container Registry (ECR)","Attributes":{}},{
"Value":"Amazon EC2 Container Service","Attributes":{}},{
"Value":"Amazon Elastic Block Store","Attributes":{}},{
"Value":"Amazon Elastic Compute Cloud - Compute","Attributes":{}},{
"Value":"Amazon Elastic Container Service for Kubernetes","Attributes":{}},{
"Value":"Amazon Elastic Load Balancing","Attributes":{}},{
"Value":"Amazon Elasticsearch Service","Attributes":{}},{
"Value":"Amazon Managed Streaming for Apache Kafka","Attributes":{}},{
"Value":"Amazon Relational Database Service","Attributes":{}},{
"Value":"Amazon Route 53","Attributes":{}},{
"Value":"Amazon Simple Email Service","Attributes":{}},{
"Value":"Amazon Simple Notification Service","Attributes":{}},{
"Value":"Amazon Simple Queue Service","Attributes":{}},{
"Value":"Amazon Simple Storage Service","Attributes":{}},{
"Value":"Amazon SimpleDB","Attributes":{}},{
"Value":"Amazon Virtual Private Cloud","Attributes":{}},{
"Value":"AmazonCloudWatch","Attributes":{}},{
"Value":"CodeBuild","Attributes":{}},{
"Value":"Tax","Attributes":{}}],

"ReturnSize":25,"TotalSize":25}
```

# Filter examples

## Cost of EC2 in region eu-north-1 in november

```
var params = {
    TimePeriod: { /* required */
        "Start": "2019-11-01",
        "End": "2019-12-01"
    },
    Granularity: 'MONTHLY',
    Metrics: [
        'AmortizedCost',
        'BlendedCost',
        'UnblendedCost',],
    Filter: {
        //get cost from ec2 in integration
        And: [
            {
                "Dimensions": {
                    "Key": "SERVICE",
                    "Values": [
                        "Amazon Elastic Compute Cloud - Compute"
                    ]
                }
            },
            {
                "Dimensions": {
                    "Key": "REGION",
                    "Values": [
                        "eu-north-1"
                    ]
                }
            }
        ]
    }
    //"Dimension": "Service"
};
```
### Output
```
{"ResultsByTime":[{"TimePeriod":{"Start":"2019-11-01","End":"2019-12-01"},"Total":{"AmortizedCost":{"Amount":"4281.3560350913","Unit":"USD"},"BlendedCost":{"Amount":"4281.3549726822","Unit":"USD"},"UnblendedCost":{"Amount":"4281.3560350913","Unit":"USD"}},"Groups":[],"Estimated":false}]}
```

# All cost together without tax in november

```
var params = {
    TimePeriod: { /* required */
        "Start": "2019-11-01",
        "End": "2019-12-01"
    },
    Granularity: 'MONTHLY',
    Metrics: [
        'AmortizedCost',
        'BlendedCost',
        'UnblendedCost',],
    Filter: {
        //get cost from ec2 in integration
        Not: 
            {
                "Dimensions": {
                    "Key": "SERVICE",
                    "Values": [
                        "Tax"
                    ]
                }
            }
        
    }
    //"Dimension": "Service"
}
```
### Output
```
{"ResultsByTime":[{"TimePeriod":{"Start":"2019-11-01","End":"2019-12-01"},"Total":{"AmortizedCost":{"Amount":"53381.8658916912","Unit":"USD"},"BlendedCost":{"Amount":"53381.8659014849","Unit":"USD"},"UnblendedCost":{"Amount":"53381.8658916912","Unit":"USD"}},"Groups":[],"Estimated":false}]}
```

# All cost of account with id 11111022112

```
var params = {
    TimePeriod: { /* required */
        "Start": firstDayMonth,
        "End": todayDate
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    Filter: {
        //     //get cost from ec2 in integration 
        "Dimensions": {
            "Key": "LINKED_ACCOUNT",
            "Values": [
                "11111022112"
            ]
        }

    }
};
```
