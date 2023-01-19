from ast import AsyncFunctionDef
import os,sys,getopt

def main(argv):
    parameters="sfr"
    parameters_long = ["start","finish", "remote"]

    do_start = False
    do_finish = False
    do_test = False
    do_remote = False

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Optional parameters are: -s, --start, -f, --finish, -r, --remote")

    for opt,arg in opts:
        if opt in ("-s","--start"):
            do_start = True

        elif opt in ("-f","--finish"):
            do_finish = True
            do_clean = True
        elif opt in ("-r","--remote"):
            do_remote = True

    if not (do_start or do_finish):
        do_start = do_finish  = True

    if do_start:
        if (do_remote):
            run_docker_compose(True)
        else:
            run_docker_compose()

    if do_finish:
        open_project_guide()
        print("BUILD DONE")

def run_docker_compose(remote_setup=False):
    if (remote_setup): 
        target = "docker-compose"
    else:
        target = "docker-compose -f docker-compose-local.yml"
    print("RUN DOCKER-COMPOSE WITH " + target)
    try:
        os.chdir("../")
        os.system(target+" run antora")
    except:
        try:
            os.system(target+" run antora")
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