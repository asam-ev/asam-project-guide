import re

def print_output_header(text):
    print(make_output_header(text))

def print_output_section():
    print(make_output_section())

def _print_line_separation():
    print(_make_line_separation())

def _make_line_separation():
    return "------------------\n"

def _print_section_separation():
    print(_make_section_separation)

def _make_section_separation():
    return "##################\n"

def make_output_section():
    return [_make_line_separation(),_make_section_separation(),_make_section_separation()]

def make_output_header(text):
    return [_make_line_separation(),text+"\n",_make_line_separation()]

def replace_attr(partial_dict,attr_dict,partial,manual_attributes = {}):
    """
    A function for replacing attributes in an include string intended to be used on partials.

    ...

    Parameters
    ----------
    partial_dict : dict
        a dict of partials
    attr_dict : dict
        a dict of (automatically collected) attributes
    partial : str
        the partial in the partial_dict that is to be checked and updated
    manual_attributes : dict
        a dict of manually defined attributes

    Returns
    -------
    str, dict
        the updated partial key and the updated partial dict
    """
    attr_pattern = re.compile("({[^}]*})")
    attr = attr_pattern.findall(partial)
    if attr:
        new_content = ""
        for a in attr:

            man_res = manual_attributes.get(a)
            auto_res = attr_dict.get(a)
            if man_res:
                new_content = partial.replace(a,man_res)

            elif auto_res:
                new_content = partial.replace(a,auto_res)#

            if new_content:
                # print ("OLD",partial)
                # print("NEW",new_content)
                value = partial_dict[partial]
                del partial_dict[partial]
                partial_dict[new_content] = value

        result,partial_dict = replace_attr(partial_dict,attr_dict,new_content,manual_attributes)
        return result, partial_dict

    module_pos = partial.find(":")
    result = partial
    if partial.find("partial$") < 0:
        value = partial_dict[partial]
        result = partial[:module_pos+1] + value + partial[module_pos+1:]
        del partial_dict[partial]
        partial_dict[result] = value

    return partial, partial_dict

def color_variant(hex_color, brightness_offset=80):
    """ takes a color like #87c95f and produces a lighter or darker variant """
    if len(hex_color) != 7:
        raise Exception("Passed %s into color_variant(), needs to be in #87c95f format." % hex_color)
    rgb_hex = [hex_color[x:x+2] for x in [1, 3, 5]]
    new_rgb_int = [int(hex_value, 16) + brightness_offset for hex_value in rgb_hex]
    new_rgb_int = [min([255, max([0, i])]) for i in new_rgb_int] # make sure new values are between 0 and 255
    # hex() produces "0x88", we want just "88"
    r = hex(new_rgb_int[0])[2:] if len(hex(new_rgb_int[0])[2:]) > 1 else "0"+hex(new_rgb_int[0])[2:]
    g = hex(new_rgb_int[1])[2:] if len(hex(new_rgb_int[1])[2:]) > 1 else "0"+hex(new_rgb_int[1])[2:]
    b = hex(new_rgb_int[2])[2:] if len(hex(new_rgb_int[2])[2:]) > 1 else "0"+hex(new_rgb_int[2])[2:]
    return "#" + r+g+b

def transform_antora_path_to_filepath(antora_path, modules_dir):
    file_path = antora_path.replace("$","s/")

    # only if neither pages nor partials is found, the following returns the same result (-1) for both:
    if file_path.find("pages") == file_path.find("partials"):
        file_path = file_path.replace(":","/pages/")

    else:
        file_path = file_path.replace(":","/")

    return modules_dir+file_path


def convert_list_of_antora_paths(antora_path_list, modules_dir):
    new_list = []
    for antora_path in antora_path_list:
        new_list.append(transform_antora_path_to_filepath(antora_path,modules_dir))

    return new_list

def create_list_of_paths_from_asciidoccontent(asciidoccontent_list):
    return [x.path[3:]+x.filename+"\n" for x in asciidoccontent_list]