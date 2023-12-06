# Amazon Linux (pre-AL2) instance reporting tool

This is a simple server that searches for any Amazon EC2 instances
and Auto Scaling Groups that might be running the original version of
Amazon Linux (2011-2018), or AL1, and provides a report you can examine
with your Web browser.

The [Amazon Linux AMI](https://aws.amazon.com/amazon-linux-ami/) ended its
standard support on December 31, 2020 and has entered a maintenance support
phase. Maintenance support ends on December 31,
2023. See https://aws.amazon.com/amazon-linux-ami/faqs/ for details.

This project is designed to help AWS customers locate instances still running
AL1 so they can determine which instances will be unsupported once maintenance
support ends. AWS advises impacted customers to migrate to a supported version
of Amazon Linux such as [Amazon Linux
2023](https://aws.amazon.com/linux/amazon-linux-2023/) or [Amazon Linux
2](https://aws.amazon.com/amazon-linux-2/).


## Building the server

First, you'll need to install NodeJS. Node version 20.10.0 is supported. Other
versions may work, but are untested. We recommend installing Node via
[Nodenv](https://github.com/nodenv/nodenv) and the
[node-build](https://github.com/nodenv/node-build) plugin, but other techniques
may work.

Once you've installed Node, install the dependencies:

```sh
npm install
```

Then, build the server:

```sh
npm run build
```

## Running the server

### Account credentials

This server depends on access to valid AWS account credentials that map to an
IAM principal with certain read-only privileges. You must provide these in [any
form that is accepted by the AWS Javascript
SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html#credchain).

The IAM principal (IAM user or Role) must have at least the following permissions:

* ec2:DescribeImages
* ec2:DescribeInstances
* ec2:DescribeLaunchTemplateVersions
* ec2:DescribeRegions
* ec2:GetConsoleOutput
* autoscaling:DescribeAutoScalingGroups
* autoscaling:DescribeLaunchConfigurations
* ssm:GetParameter

You are solely responsible for ensuring the policies associated with the IAM
principal are tailored to your organization's needs and requirements.

### Start the server

To start the server:

```sh
npm run start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view
the results. Note that the first page load may take a few moments while the
server examines your AWS resources.

## Reporting issues

Please report bugs and issues via GitHub Issues.
