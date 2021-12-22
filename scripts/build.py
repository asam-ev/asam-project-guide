import os,sys,getopt

def main(argv):
    parameters="sft"
    parameters_long = ["start","finish","test"]

    do_start = False
    do_finish = False
    do_test = False

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Optional parameters are: -s, --start, -f, --finish, -t, --test")

    for opt,arg in opts:
        if opt in ("-s","--start"):
            do_start = True

        elif opt in ("-f","--finish"):
            do_finish = True
            do_clean = True

        elif opt in ("-t","--test"):
            do_test = True

    if not (do_start or do_finish):
        do_start = do_finish  = True


    if do_test:
        asam_macro_replacement()
        nav_adoc_creation()
        cleanup()
        exit(0)

    if do_start:
        asam_macro_replacement()
        nav_adoc_creation()
        run_docker_compose()

    if do_finish:
        cleanup()
        open_project_guide()
        print("BUILD DONE")

def asam_macro_replacement():
    print("CREATE REFERENCES BY ATTRIBUTES")
    try:
        os.system("python asam_antora_macros.py -p doc/modules")
    except:
        pass

def nav_adoc_creation():
    print("CREATE NAV.ADOC FOR FOLDER")
    try:
        os.system("python create_nav_adoc_for_folder.py -p doc/modules/compendium/pages/ --module")
    except:
        pass

def run_docker_compose():
    print("RUN DOCKER-COMPOSE")
    try:
        os.system("docker-compose run antora")
    except:
        try:
            os.chdir("../")
            # print(os.getcwd())
            os.system("docker-compose run antora")
        except:
            pass


def cleanup():
    print("CLEANUP AFTER BUILD")
    try:
        os.system("python cleanup_after_build.py -p doc/modules")
    except:
        try:
            os.chdir("./scripts")
            # print(os.getcwd())
            os.system("python cleanup_after_build.py -p doc/modules")
        except:
            pass

def open_project_guide():
    print("OPEN INDEX.HTML")
    try:
        os.chdir("../site")
        # print(os.getcwd())
        os.system("start chrome {pos}".format(pos = os.getcwd()+"/index.html"))
    except:
        try:
            os.system("start chrome {pos}".format(pos = os.getcwd()+"/index.html"))
        except:
            pass

if __name__ == "__main__":
    main(sys.argv[1:])