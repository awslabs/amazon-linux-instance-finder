export type AutoScalingGroup = {
  auto_scaling_group_name: string;
  image_id: string;
  image_description: string;
  launch_configuration_name?: string;
  launch_template_id?: string;
  launch_template_name?: string;
  launch_template_version?: string;
}